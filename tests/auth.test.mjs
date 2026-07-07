import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertAdmin,
  authenticateCredentials,
  createSessionCookieValue,
  verifySessionCookieValue,
} from "../lib/auth/sessionCore.mjs";
import { hashPassword, verifyPassword } from "../lib/auth/passwordCore.mjs";

test("auth session cookie verifies signed sessions and rejects tampering", () => {
  const secret = "test-secret";
  const session = {
    userId: "user-a",
    email: "user-a@example.test",
    role: "user",
    workspaceId: "workspace-a",
  };

  const cookieValue = createSessionCookieValue(session, secret);
  const verified = verifySessionCookieValue(cookieValue, secret);

  assert.equal(verified.userId, session.userId);
  assert.equal(verified.workspaceId, session.workspaceId);
  assert.equal(verified.role, "user");
  assert.equal(verifySessionCookieValue(cookieValue.replace(/.$/, "x"), secret), null);
  assert.equal(verifySessionCookieValue("not-a-session", secret), null);
});

test("password helper hashes and verifies without plain-text comparison", async () => {
  const passwordHash = await hashPassword("alice-pass");

  assert.match(passwordHash, /^scrypt\$/);
  assert.notEqual(passwordHash, "alice-pass");
  assert.equal(await verifyPassword("alice-pass", passwordHash), true);
  assert.equal(await verifyPassword("wrong-pass", passwordHash), false);
});

test("database credentials authenticate users and admin assertion is server-side", async () => {
  const users = new Map([
    [
      "alice@example.test",
      {
        _id: "alice",
        email: "alice@example.test",
        passwordHash: await hashPassword("alice-pass"),
        role: "user",
        workspaceId: "workspace-a",
        active: true,
        lockedAt: null,
        save: async function save() {
          this.saved = true;
        },
      },
    ],
    [
      "admin@example.test",
      {
        _id: "admin",
        email: "admin@example.test",
        passwordHash: await hashPassword("admin-pass"),
        role: "admin",
        workspaceId: "workspace-admin",
        active: true,
        lockedAt: null,
        save: async function save() {
          this.saved = true;
        },
      },
    ],
  ]);
  const UserModel = {
    findOne(query) {
      return {
        select: async () => users.get(query.email) ?? null,
      };
    },
  };

  const alice = await authenticateCredentials({ email: " ALICE@example.test ", password: "alice-pass" }, { UserModel });
  const admin = await authenticateCredentials({ email: "admin@example.test", password: "admin-pass" }, { UserModel });

  assert.equal(alice.userId, "alice");
  assert.equal(alice.workspaceId, "workspace-a");
  assert.equal(admin.role, "admin");
  assert.equal(assertAdmin(admin), admin);
  assert.throws(() => assertAdmin(alice), /Bạn không có quyền/);
  await assert.rejects(
    authenticateCredentials({ email: "alice@example.test", password: "wrong" }, { UserModel }),
    /Email hoặc mật khẩu/,
  );
  assert.ok(users.get("alice@example.test").lastLoginAt instanceof Date);
});

test("database credentials reject inactive and locked users", async () => {
  const passwordHash = await hashPassword("valid-pass");
  const records = {
    inactive: { _id: "inactive", email: "inactive@example.test", passwordHash, role: "user", workspaceId: "workspace-a", active: false, lockedAt: null },
    locked: { _id: "locked", email: "locked@example.test", passwordHash, role: "user", workspaceId: "workspace-a", active: true, lockedAt: new Date() },
  };
  const UserModel = {
    findOne(query) {
      return {
        select: async () => records[query.email.split("@")[0]] ?? null,
      };
    },
  };

  await assert.rejects(
    authenticateCredentials({ email: "inactive@example.test", password: "valid-pass" }, { UserModel }),
    /Email hoặc mật khẩu/,
  );
  await assert.rejects(
    authenticateCredentials({ email: "locked@example.test", password: "valid-pass" }, { UserModel }),
    /Email hoặc mật khẩu/,
  );
});
