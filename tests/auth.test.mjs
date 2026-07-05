import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertAdmin,
  authenticateCredentials,
  createSessionCookieValue,
  verifySessionCookieValue,
} from "../lib/auth/sessionCore.mjs";

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

test("configured credentials authenticate two users and admin assertion is server-side", () => {
  const originalUsers = process.env.AUTH_USERS_JSON;
  process.env.AUTH_USERS_JSON = JSON.stringify([
    { id: "alice", email: "alice@example.test", password: "alice-pass", role: "user", workspaceId: "workspace-a" },
    { id: "admin", email: "admin@example.test", password: "admin-pass", role: "admin", workspaceId: "workspace-admin" },
  ]);

  try {
    const alice = authenticateCredentials({ email: " ALICE@example.test ", password: "alice-pass" });
    const admin = authenticateCredentials({ email: "admin@example.test", password: "admin-pass" });

    assert.equal(alice.userId, "alice");
    assert.equal(alice.workspaceId, "workspace-a");
    assert.equal(admin.role, "admin");
    assert.equal(assertAdmin(admin), admin);
    assert.throws(() => assertAdmin(alice), /Bạn không có quyền/);
    assert.throws(() => authenticateCredentials({ email: "alice@example.test", password: "wrong" }), /Email hoặc mật khẩu/);
  } finally {
    if (originalUsers === undefined) {
      delete process.env.AUTH_USERS_JSON;
    } else {
      process.env.AUTH_USERS_JSON = originalUsers;
    }
  }
});
