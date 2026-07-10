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
import { createAuditLogsRouteHandler } from "../lib/api/auditLogsRouteCore.mjs";
import {
  createBootstrapUsersRouteHandler,
  createForgotPasswordRouteHandler,
  createRegisterRouteHandler,
  createResetPasswordRouteHandler,
} from "../lib/api/authAccountRouteCore.mjs";
import { createLoginRouteHandler, createLogoutRouteHandler } from "../lib/api/authRouteCore.mjs";
import { ApiError } from "../lib/api/errorsCore.mjs";
import { logAuthEvent, sanitizeAuditResource } from "../lib/audit/logAuthEventCore.mjs";

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

const clone = (value) => {
  if (value instanceof Date) return new Date(value);
  if (Array.isArray(value)) return value.map(clone);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [key, clone(entryValue)]));
};

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

const createFakeAuditLogModel = (initialLogs = []) => {
  const state = {
    logs: initialLogs.map(clone),
  };

  const queryMatches = (log, query = {}) =>
    Object.entries(query).every(([field, value]) => {
      if (field === "resource.type") return log.resource?.type === value;
      if (field === "resource.id") return log.resource?.id === value;
      return log[field] === value;
    });

  return {
    state,
    async create(record) {
      const log = { _id: `audit-${state.logs.length + 1}`, createdAt: new Date(0).toISOString(), ...clone(record) };
      state.logs.push(log);
      return clone(log);
    },
    find(query = {}) {
      const filtered = state.logs.filter((log) => queryMatches(log, query));
      return {
        sort() {
          return {
            limit(limit) {
              return {
                lean: async () => clone(filtered.slice(0, limit)),
              };
            },
          };
        },
      };
    },
  };
};

const createFakePasswordResetTokenModel = () => {
  const state = {
    tokens: [],
  };

  return {
    state,
    async create(record) {
      const token = {
        _id: `reset-${state.tokens.length + 1}`,
        ...clone(record),
        async save() {
          const index = state.tokens.findIndex((item) => item._id === this._id);
          state.tokens[index] = this;
        },
      };
      state.tokens.push(token);
      return token;
    },
    async findOne(query) {
      return state.tokens.find(
        (token) =>
          token.tokenHash === query.tokenHash &&
          token.usedAt === query.usedAt &&
          token.expiresAt > query.expiresAt.$gt,
      ) ?? null;
    },
    async updateMany(query, update) {
      for (const token of state.tokens) {
        if (token.userId === query.userId && token.usedAt === query.usedAt) {
          token.usedAt = update.$set.usedAt;
        }
      }
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

test("audit helper records request context and redacts sensitive resource fields", async () => {
  const AuditLogModel = createFakeAuditLogModel();
  const request = new Request("https://test.local/api/auth/login", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "user-agent": "node-test",
      "x-correlation-id": "corr-1",
    },
  });

  await logAuthEvent({
    AuditLogModel,
    event: "PASSWORD_RESET_REQUESTED",
    request,
    email: "alice@example.test",
    resource: {
      type: "auth",
      rawToken: "secret-token",
      nested: { password: "never-log" },
    },
  });

  assert.equal(AuditLogModel.state.logs[0].event, "PASSWORD_RESET_REQUESTED");
  assert.equal(AuditLogModel.state.logs[0].email, "alice@example.test");
  assert.equal(AuditLogModel.state.logs[0].ip, "203.0.113.10");
  assert.equal(AuditLogModel.state.logs[0].userAgent, "node-test");
  assert.equal(AuditLogModel.state.logs[0].correlationId, "corr-1");
  assert.equal(AuditLogModel.state.logs[0].resource.rawToken, "[redacted]");
  assert.equal(AuditLogModel.state.logs[0].resource.nested.password, "[redacted]");
  assert.deepEqual(sanitizeAuditResource({ passwordHash: "x", safe: "y" }), { passwordHash: "[redacted]", safe: "y" });
});

test("login route writes success and failure audit events without passwords", async () => {
  const AuditLogModel = createFakeAuditLogModel();
  const session = { userId: "alice", email: "alice@example.test", role: "user", workspaceId: "workspace-a" };
  const login = createLoginRouteHandler({
    authenticateCredentials: async ({ password }) => {
      if (password !== "valid-pass") {
        throw new ApiError(401, "UNAUTHENTICATED", "Email hoặc mật khẩu không đúng.");
      }
      return session;
    },
    createSessionCookieValue: () => "signed-session",
    authCookieName: "test_session",
    connectToDatabase: async () => {},
    UserModel: {},
    AuditLogModel,
  });

  const success = await readJson(
    await login(
      jsonRequest(
        "https://test.local/api/auth/login",
        { email: " Alice@Example.Test ", password: "valid-pass" },
        "POST",
      ),
    ),
  );
  assert.equal(success.status, 200);
  assert.equal(AuditLogModel.state.logs[0].event, "LOGIN_SUCCESS");
  assert.equal(AuditLogModel.state.logs[0].userId, "alice");
  assert.equal(JSON.stringify(AuditLogModel.state.logs[0]).includes("valid-pass"), false);

  const failure = await readJson(
    await login(
      jsonRequest(
        "https://test.local/api/auth/login",
        { email: " Alice@Example.Test ", password: "wrong-pass" },
        "POST",
      ),
    ),
  );
  assert.equal(failure.status, 401);
  assert.equal(AuditLogModel.state.logs[1].event, "LOGIN_FAILURE");
  assert.equal(AuditLogModel.state.logs[1].email, "alice@example.test");
  assert.equal(AuditLogModel.state.logs[1].resource.errorCode, "UNAUTHENTICATED");
  assert.equal(JSON.stringify(AuditLogModel.state.logs[1]).includes("wrong-pass"), false);
});

test("register route creates a hashed user and signs in the first account as admin", async () => {
  const AuditLogModel = createFakeAuditLogModel();
  const users = [];
  const UserModel = {
    async countDocuments() {
      return users.length;
    },
    findOne(query) {
      const user = users.find((item) => item.email === query.email) ?? null;
      return {
        select: async () => user,
      };
    },
    async create(record) {
      const user = {
        _id: `user-${users.length + 1}`,
        ...clone(record),
        save: async function save() {
          this.saved = true;
        },
      };
      users.push(user);
      return user;
    },
  };

  const register = createRegisterRouteHandler({
    connectToDatabase: async () => {},
    UserModel,
    authenticateCredentials,
    createSessionCookieValue: () => "signed-register-session",
    authCookieName: "test_session",
    AuditLogModel,
  });

  const response = await readJson(
    await register(
      jsonRequest(
        "https://test.local/api/auth/register",
        { email: " Owner@Example.Test ", password: "valid-pass", displayName: "  Owner One  " },
        "POST",
      ),
    ),
  );

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, "owner@example.test");
  assert.equal(response.body.user.role, "admin");
  assert.equal(users[0].email, "owner@example.test");
  assert.equal(users[0].displayName, "Owner One");
  assert.match(users[0].passwordHash, /^scrypt\$/);
  assert.equal(await verifyPassword("valid-pass", users[0].passwordHash), true);
  assert.equal(AuditLogModel.state.logs[0].event, "LOGIN_SUCCESS");

  const duplicate = await readJson(
    await register(jsonRequest("https://test.local/api/auth/register", { email: "owner@example.test", password: "valid-pass" }, "POST")),
  );
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, "EMAIL_ALREADY_REGISTERED");
});

test("forgot and reset password flow stores only token hash and blocks replay", async () => {
  const AuditLogModel = createFakeAuditLogModel();
  const PasswordResetTokenModel = createFakePasswordResetTokenModel();
  const user = {
    _id: "alice",
    email: "alice@example.test",
    passwordHash: await hashPassword("old-pass"),
    role: "user",
    workspaceId: "workspace-a",
    active: true,
    lockedAt: null,
    async save() {
      this.saved = true;
    },
  };
  const UserModel = {
    findOne(query) {
      return {
        select: async () => (query.email === user.email ? user : null),
      };
    },
    async findById(id) {
      return id === user._id ? user : null;
    },
  };

  const forgot = createForgotPasswordRouteHandler({
    connectToDatabase: async () => {},
    UserModel,
    PasswordResetTokenModel,
    AuditLogModel,
  });
  const forgotResponse = await readJson(
    await forgot(jsonRequest("https://test.local/api/auth/forgot-password", { email: "alice@example.test" }, "POST")),
  );

  assert.equal(forgotResponse.status, 200);
  assert.match(forgotResponse.body.resetLink, /^https:\/\/test\.local\/forgot-password\?token=/);
  const rawToken = new URL(forgotResponse.body.resetLink).searchParams.get("token");
  assert.equal(JSON.stringify(PasswordResetTokenModel.state.tokens).includes(rawToken), false);
  assert.equal(PasswordResetTokenModel.state.tokens.length, 1);

  const reset = createResetPasswordRouteHandler({
    connectToDatabase: async () => {},
    UserModel,
    PasswordResetTokenModel,
    AuditLogModel,
    authCookieName: "test_session",
  });

  const resetResponse = await readJson(
    await reset(jsonRequest("https://test.local/api/auth/reset-password", { token: rawToken, password: "new-valid-pass" }, "POST")),
  );
  assert.equal(resetResponse.status, 200);
  assert.equal(await verifyPassword("new-valid-pass", user.passwordHash), true);
  assert.ok(user.passwordChangedAt instanceof Date);
  assert.ok(PasswordResetTokenModel.state.tokens[0].usedAt instanceof Date);
  assert.equal(AuditLogModel.state.logs.at(-1).event, "PASSWORD_RESET_COMPLETED");

  const replay = await readJson(
    await reset(jsonRequest("https://test.local/api/auth/reset-password", { token: rawToken, password: "another-pass" }, "POST")),
  );
  assert.equal(replay.status, 400);
  assert.equal(replay.body.error.code, "INVALID_TOKEN");
});

test("bootstrap users route requires token and upserts configured users without auditing secrets", async () => {
  const previousToken = process.env.AUTH_BOOTSTRAP_TOKEN;
  process.env.AUTH_BOOTSTRAP_TOKEN = "bootstrap-secret";

  try {
    const AuditLogModel = createFakeAuditLogModel();
    const updates = [];
    const UserModel = {
      async updateOne(query, update, options) {
        updates.push({ query: clone(query), update: clone(update), options: clone(options) });
      },
    };
    const configuredUsers = [
      {
        email: " Admin@Example.Test ",
        password: "never-log-this-password",
        role: "admin",
        workspaceId: "admin-workspace",
        displayName: "  Admin User  ",
        active: true,
      },
    ];
    const bootstrap = createBootstrapUsersRouteHandler({
      connectToDatabase: async () => {},
      UserModel,
      getConfiguredUsers: () => configuredUsers,
      AuditLogModel,
    });

    const missingToken = await readJson(
      await bootstrap(new Request("https://test.local/api/auth/bootstrap-users", { method: "POST" })),
    );
    assert.equal(missingToken.status, 403);
    assert.equal(updates.length, 0);

    const response = await readJson(
      await bootstrap(
        new Request("https://test.local/api/auth/bootstrap-users", {
          method: "POST",
          headers: { authorization: "Bearer bootstrap-secret" },
        }),
      ),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.users, [
      { email: "admin@example.test", role: "admin", workspaceId: "admin-workspace" },
    ]);
    assert.equal(updates.length, 1);
    assert.deepEqual(updates[0].query, { email: "admin@example.test" });
    assert.match(updates[0].update.$set.passwordHash, /^scrypt\$/);
    assert.equal(await verifyPassword("never-log-this-password", updates[0].update.$set.passwordHash), true);
    assert.equal(updates[0].options.upsert, true);
    assert.equal(AuditLogModel.state.logs.at(-1).event, "USER_BOOTSTRAPPED");
    assert.equal(AuditLogModel.state.logs.at(-1).resource.count, 1);
    assert.equal(JSON.stringify(AuditLogModel.state.logs).includes("never-log-this-password"), false);
    assert.equal(JSON.stringify(AuditLogModel.state.logs).includes("bootstrap-secret"), false);
  } finally {
    if (previousToken === undefined) {
      delete process.env.AUTH_BOOTSTRAP_TOKEN;
    } else {
      process.env.AUTH_BOOTSTRAP_TOKEN = previousToken;
    }
  }
});

test("bootstrap users route is disabled when AUTH_BOOTSTRAP_TOKEN is missing", async () => {
  const previousToken = process.env.AUTH_BOOTSTRAP_TOKEN;
  delete process.env.AUTH_BOOTSTRAP_TOKEN;

  try {
    const bootstrap = createBootstrapUsersRouteHandler({
      connectToDatabase: async () => {
        throw new Error("database should not be reached");
      },
      UserModel: {},
      getConfiguredUsers: () => [],
      AuditLogModel: createFakeAuditLogModel(),
    });

    const response = await readJson(
      await bootstrap(
        new Request("https://test.local/api/auth/bootstrap-users", {
          method: "POST",
          headers: { "x-bootstrap-token": "anything" },
        }),
      ),
    );
    assert.equal(response.status, 503);
    assert.equal(response.body.error.code, "BOOTSTRAP_DISABLED");
  } finally {
    if (previousToken === undefined) {
      delete process.env.AUTH_BOOTSTRAP_TOKEN;
    } else {
      process.env.AUTH_BOOTSTRAP_TOKEN = previousToken;
    }
  }
});

test("logout route writes audit event when session is present", async () => {
  const AuditLogModel = createFakeAuditLogModel();
  const session = { userId: "alice", email: "alice@example.test", role: "user", workspaceId: "workspace-a" };
  const logout = createLogoutRouteHandler({
    authCookieName: "test_session",
    requireAuth: () => session,
    AuditLogModel,
  });

  const response = await readJson(await logout(new Request("https://test.local/api/auth/logout", { method: "POST" })));
  assert.equal(response.status, 200);
  assert.equal(AuditLogModel.state.logs[0].event, "LOGOUT");
  assert.equal(AuditLogModel.state.logs[0].userId, "alice");
});

test("audit logs route supports admin filters by user and resource", async () => {
  const AuditLogModel = createFakeAuditLogModel([
    {
      _id: "audit-1",
      event: "LOGIN_SUCCESS",
      userId: "alice",
      email: "alice@example.test",
      role: "user",
      workspaceId: "workspace-a",
      resource: { type: "auth", id: "login" },
      createdAt: "2026-07-07T00:00:00.000Z",
    },
    {
      _id: "audit-2",
      event: "CATALOG_PRODUCT_UPDATED",
      userId: "admin",
      email: "admin@example.test",
      role: "admin",
      workspaceId: "admin",
      resource: { type: "catalog_product", id: "product-a" },
      createdAt: "2026-07-07T00:01:00.000Z",
    },
  ]);
  const adminSession = { userId: "admin", email: "admin@example.test", role: "admin", workspaceId: "admin" };
  const handler = createAuditLogsRouteHandler({
    connectToDatabase: async () => {},
    AuditLogModel,
    requireAuth: () => adminSession,
  });

  const byUser = await readJson(await handler(new Request("https://test.local/api/admin/audit-logs?userId=alice")));
  assert.equal(byUser.status, 200);
  assert.deepEqual(
    byUser.body.logs.map((log) => log.id),
    ["audit-1"],
  );

  const byResource = await readJson(
    await handler(new Request("https://test.local/api/admin/audit-logs?resourceType=catalog_product&resourceId=product-a")),
  );
  assert.equal(byResource.status, 200);
  assert.deepEqual(
    byResource.body.logs.map((log) => log.id),
    ["audit-2"],
  );

  const userHandler = createAuditLogsRouteHandler({
    connectToDatabase: async () => {},
    AuditLogModel,
    requireAuth: () => ({ userId: "alice", email: "alice@example.test", role: "user", workspaceId: "workspace-a" }),
  });
  const blocked = await readJson(await userHandler(new Request("https://test.local/api/admin/audit-logs")));
  assert.equal(blocked.status, 403);
});
