import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertAdmin,
  authenticateCredentials,
  createSessionCookieValue,
  verifySessionCookieValue,
} from "../lib/auth/sessionCore.mjs";
import { hashPassword, verifyPassword } from "../lib/auth/passwordCore.mjs";
import { canManageCatalog, canManageUsers, canReadWorkspace } from "../lib/auth/rbacCore.mjs";
import { createAdminUsersRouteHandlers, createProfileRouteHandlers } from "../lib/api/userProfileRouteCore.mjs";
import { ApiError } from "../lib/api/errorsCore.mjs";

const jsonRequest = (url, body, method = "PATCH") =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const createUserQuery = (users) => ({
  sort(sortSpec = {}) {
    const [field, direction] = Object.entries(sortSpec)[0] ?? ["email", 1];
    const sorted = [...users].sort((left, right) => {
      const comparison = String(left[field] ?? "").localeCompare(String(right[field] ?? ""));
      return direction < 0 ? -comparison : comparison;
    });
    return {
      lean: async () => clone(sorted),
    };
  },
});

const createFakeUserModel = (initialUsers) => {
  const state = {
    users: initialUsers.map(clone),
    updates: [],
  };

  return {
    state,
    async findById(id) {
      const user = state.users.find((item) => item._id === id || item.id === id);
      return user ? clone(user) : null;
    },
    find() {
      return createUserQuery(state.users);
    },
    async findByIdAndUpdate(id, update) {
      const index = state.users.findIndex((item) => item._id === id || item.id === id);
      if (index === -1) return null;
      state.updates.push({ id, update: clone(update) });
      state.users[index] = { ...state.users[index], ...clone(update) };
      return clone(state.users[index]);
    },
  };
};

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

test("RBAC policy helpers allow admin management and workspace reads only within workspace", () => {
  const admin = { userId: "admin", role: "admin", workspaceId: "workspace-a" };
  const user = { userId: "user", role: "user", workspaceId: "workspace-a" };

  assert.equal(canManageCatalog(admin), true);
  assert.equal(canManageUsers(admin), true);
  assert.equal(canManageCatalog(user), false);
  assert.equal(canManageUsers(user), false);
  assert.equal(canReadWorkspace(user, "workspace-a"), true);
  assert.equal(canReadWorkspace(user, "workspace-b"), false);
});

test("profile route requires a session and blocks self privilege escalation", async () => {
  const UserModel = createFakeUserModel([
    {
      _id: "alice",
      email: "alice@example.test",
      role: "user",
      workspaceId: "workspace-a",
      displayName: "Alice",
      active: true,
      lockedAt: null,
    },
  ]);
  const session = { userId: "alice", email: "alice@example.test", role: "user", workspaceId: "workspace-a" };
  const handlers = createProfileRouteHandlers({
    connectToDatabase: async () => {},
    UserModel,
    requireAuth: () => session,
  });

  const profile = await readJson(await handlers.GET(new Request("https://test.local/api/profile")));
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.email, "alice@example.test");
  assert.equal(profile.body.user.role, "user");

  const blocked = await readJson(
    await handlers.PATCH(
      jsonRequest("https://test.local/api/profile", {
        displayName: "Alice Admin",
        role: "admin",
        workspaceId: "workspace-admin",
      }),
    ),
  );
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.error.code, "FORBIDDEN_PROFILE_FIELD");
  assert.equal(UserModel.state.users[0].role, "user");
  assert.equal(UserModel.state.users[0].workspaceId, "workspace-a");

  const updated = await readJson(
    await handlers.PATCH(jsonRequest("https://test.local/api/profile", { displayName: "  Alice   Nguyen  " })),
  );
  assert.equal(updated.status, 200);
  assert.equal(updated.body.user.displayName, "Alice Nguyen");
  assert.deepEqual(UserModel.state.updates.at(-1).update, { displayName: "Alice Nguyen" });
});

test("profile route rejects unauthenticated requests", async () => {
  const UserModel = createFakeUserModel([]);
  const handlers = createProfileRouteHandlers({
    connectToDatabase: async () => {},
    UserModel,
    requireAuth() {
      throw new ApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
    },
  });

  const response = await readJson(await handlers.GET(new Request("https://test.local/api/profile")));
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHENTICATED");
  assert.equal(UserModel.state.updates.length, 0);
});

test("admin users route lets admin change role and workspace but blocks normal users", async () => {
  const UserModel = createFakeUserModel([
    {
      _id: "alice",
      email: "alice@example.test",
      role: "user",
      workspaceId: "workspace-a",
      displayName: "Alice",
      active: true,
      lockedAt: null,
    },
    {
      _id: "admin",
      email: "admin@example.test",
      role: "admin",
      workspaceId: "workspace-admin",
      displayName: "Admin",
      active: true,
      lockedAt: null,
    },
  ]);
  const adminSession = { userId: "admin", email: "admin@example.test", role: "admin", workspaceId: "workspace-admin" };
  const userSession = { userId: "alice", email: "alice@example.test", role: "user", workspaceId: "workspace-a" };

  const adminHandlers = createAdminUsersRouteHandlers({
    connectToDatabase: async () => {},
    UserModel,
    requireAuth: () => adminSession,
  });
  const users = await readJson(await adminHandlers.GET(new Request("https://test.local/api/admin/users")));
  assert.equal(users.status, 200);
  assert.deepEqual(
    users.body.users.map((user) => user.email),
    ["admin@example.test", "alice@example.test"],
  );

  const updated = await readJson(
    await adminHandlers.PATCH(
      jsonRequest("https://test.local/api/admin/users/alice", {
        role: "admin",
        workspaceId: "workspace-b",
        displayName: "Alice Lead",
      }),
      { params: Promise.resolve({ id: "alice" }) },
    ),
  );
  assert.equal(updated.status, 200);
  assert.equal(updated.body.user.role, "admin");
  assert.equal(updated.body.user.workspaceId, "workspace-b");
  assert.equal(UserModel.state.users.find((user) => user._id === "alice").role, "admin");

  const userHandlers = createAdminUsersRouteHandlers({
    connectToDatabase: async () => {},
    UserModel,
    requireAuth: () => userSession,
  });
  const blocked = await readJson(
    await userHandlers.PATCH(jsonRequest("https://test.local/api/admin/users/admin", { role: "user" }), {
      params: Promise.resolve({ id: "admin" }),
    }),
  );
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.error.code, "FORBIDDEN");
});
