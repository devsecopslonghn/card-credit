import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { registerAuthRoutes } from "../src/auth-routes.js";
import type { AuthRepository, AuthUser, ResetToken } from "../src/auth-repository.js";

class MemoryAuth implements AuthRepository {
  users: AuthUser[] = []; tokens: ResetToken[] = [];
  async countUsers() { return this.users.length; }
  async findUserByEmail(email: string) { return this.users.find((u) => u.email === email) ?? null; }
  async findUserById(id: string) { return this.users.find((u) => u.id === id) ?? null; }
  async createUser(user: Omit<AuthUser, "id">) { const created = { ...structuredClone(user), id: String(this.users.length + 1) }; this.users.push(created); return created; }
  async upsertUser(user: Omit<AuthUser, "id">) { const current = await this.findUserByEmail(user.email); if (current) { Object.assign(current, structuredClone(user)); return current; } return this.createUser(user); }
  async updatePassword(id: string, hash: string) { (await this.findUserById(id))!.passwordHash = hash; }
  async touchLogin() {}
  async createResetToken(token: ResetToken) { this.tokens.push(structuredClone(token)); }
  async findResetToken(hash: string, now: Date) { return this.tokens.find((t) => t.tokenHash === hash && !t.usedAt && t.expiresAt > now) ?? null; }
  async consumeResetTokens(userId: string, now: Date) { this.tokens.filter((t) => t.userId === userId && !t.usedAt).forEach((t) => { t.usedAt = now; }); }
}
const secret = "01234567890123456789012345678901";

test("register, me, logout, login, and reset preserve cookie contracts", async () => {
  const repository = new MemoryAuth(); const events: string[] = [];
  const app = buildApp({ isReady: () => true }, "silent");
  registerAuthRoutes(app, { repository, secret, returnResetToken: true, audit: async (event) => { events.push(event); } });
  const registered = await app.inject({ method: "POST", url: "/api/auth/register", payload: { email: "admin@example.test", password: "valid-pass" } });
  assert.equal(registered.statusCode, 201); const cookie = String(registered.headers["set-cookie"]); assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Lax/);
  const me = await app.inject({ url: "/api/auth/me", headers: { cookie } }); assert.equal(me.statusCode, 200); assert.equal(me.json().user.role, "admin");
  const logout = await app.inject({ method: "POST", url: "/api/auth/logout", headers: { cookie } }); assert.match(String(logout.headers["set-cookie"]), /Max-Age=0/);
  const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "admin@example.test", password: "valid-pass" } }); assert.equal(login.statusCode, 200);
  const forgot = await app.inject({ method: "POST", url: "/api/auth/forgot-password", headers: { "x-forwarded-host": "test.local", "x-forwarded-proto": "https" }, payload: { email: "admin@example.test" } }); assert.match(forgot.json().resetLink, /^https:\/\/test\.local\/forgot-password\?token=/); const token = new URL(forgot.json().resetLink).searchParams.get("token")!;
  const reset = await app.inject({ method: "POST", url: "/api/auth/reset-password", payload: { token, password: "new-valid-pass" } }); assert.equal(reset.statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "admin@example.test", password: "new-valid-pass" } })).statusCode, 200);
  assert.ok(events.includes("LOGIN_SUCCESS")); assert.ok(events.includes("PASSWORD_RESET_COMPLETED")); await app.close();
});

test("bootstrap is disabled without token and guarded when configured", async () => {
  const repository = new MemoryAuth(); const app = buildApp({ isReady: () => true }, "silent");
  registerAuthRoutes(app, { repository, secret });
  assert.equal((await app.inject({ method: "POST", url: "/api/auth/bootstrap-users" })).statusCode, 503); await app.close();
  const enabled = buildApp({ isReady: () => true }, "silent"); registerAuthRoutes(enabled, { repository, secret, bootstrapToken: "bootstrap-secret", configuredUsers: [{ email: "user@example.test", password: "valid-pass", role: "user", workspaceId: "w1" }] });
  assert.equal((await enabled.inject({ method: "POST", url: "/api/auth/bootstrap-users", headers: { authorization: "Bearer wrong" } })).statusCode, 403);
  assert.equal((await enabled.inject({ method: "POST", url: "/api/auth/bootstrap-users", headers: { authorization: "Bearer bootstrap-secret" } })).statusCode, 200); await enabled.close();
});
