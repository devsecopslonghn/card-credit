import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { signSession, sessionCookie } from "../src/auth.js";
import { InMemoryNotesRepository } from "../src/notes.js";
import { registerNotesRoutes } from "../src/notes-routes.js";
const secret = "01234567890123456789012345678901";
const cookie = (workspaceId: string) => sessionCookie(signSession({ userId: "u1", email: "u@example.test", role: "user", workspaceId }, secret));
test("notes require auth, scope by workspace, upsert, and delete blank content", async () => {
  const repository = new InMemoryNotesRepository(); const app = buildApp({ isReady: () => true }, "silent"); registerNotesRoutes(app, repository, secret);
  assert.equal((await app.inject({ url: "/api/notes" })).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/api/notes", headers: { cookie: cookie("a") }, payload: { date: "2026-07-11", content: " Note " } })).statusCode, 200);
  assert.equal((await app.inject({ url: "/api/notes", headers: { cookie: cookie("a") } })).json()[0].content, "Note");
  assert.deepEqual((await app.inject({ url: "/api/notes", headers: { cookie: cookie("b") } })).json(), []);
  await app.inject({ method: "POST", url: "/api/notes", headers: { cookie: cookie("a") }, payload: { date: "2026-07-11", content: " " } }); assert.deepEqual((await app.inject({ url: "/api/notes", headers: { cookie: cookie("a") } })).json(), []); await app.close();
});
