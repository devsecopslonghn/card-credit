import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { signSession, sessionCookie } from "../src/auth.js";
import { registerUserRoutes } from "../src/user-routes.js";
import { registerWorkspaceRoutes } from "../src/workspace-routes.js";
import { WorkspaceModel } from "../src/models/workspace.js";
import type { AuthRepository, AuthUser } from "../src/auth-repository.js";

const secret = "01234567890123456789012345678901";
const user: AuthUser = { id: "u1", email: "u@example.test", passwordHash: "", role: "user", workspaceId: "workspace-a", displayName: "User", active: true, lockedAt: null };
const users = { findUserById: async (id: string) => id === user.id ? user : null } as unknown as AuthRepository;
const cookie = () => sessionCookie(signSession({ userId: user.id, email: user.email, role: user.role, workspaceId: "workspace-a" }, secret));

test("private profile and workspace reads revalidate active identity before downstream reads", async (t) => {
  const workspaceFind = t.mock.method(WorkspaceModel, "findOne", async (filter: Record<string, unknown>) => {
    assert.deepEqual(filter, { workspaceId: "workspace-a" });
    return { get: (key: string) => key === "ownerUserId" ? "owner-1" : undefined } as never;
  });
  const app = buildApp({ isReady: () => true }, "silent");
  registerUserRoutes(app, users, secret);
  registerWorkspaceRoutes(app, users, secret);

  const headers = { cookie: cookie() };
  const profile = await app.inject({ url: "/api/profile", headers });
  assert.equal(profile.statusCode, 200);
  assert.equal(profile.json().user.id, "u1");
  const owner = await app.inject({ url: "/api/workspace/owner", headers });
  assert.equal(owner.statusCode, 200);
  assert.deepEqual(owner.json(), { data: { configured: true } });
  assert.equal(workspaceFind.mock.callCount(), 1);

  user.workspaceId = "workspace-b";
  assert.equal((await app.inject({ url: "/api/profile", headers })).statusCode, 401);
  assert.equal((await app.inject({ url: "/api/workspace/owner", headers })).statusCode, 401);
  assert.equal(workspaceFind.mock.callCount(), 1);
  user.workspaceId = "workspace-a";
  await app.close();
});
