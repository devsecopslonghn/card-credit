import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { registerCardRoutes } from "../src/card-routes.js";
import { sessionCookie, signSession } from "../src/auth.js";

const secret = "01234567890123456789012345678901";
const cookie = sessionCookie(signSession({ userId: "user-1", email: "user@example.test", role: "user", workspaceId: "workspace-a" }, secret));

test("card routes require authentication and validate requests before database access", async () => {
  const app = buildApp({ isReady: () => true }, "silent");
  registerCardRoutes(app, secret);
  for (const request of [
    { method: "GET", url: "/api/cards" },
    { method: "POST", url: "/api/cards", payload: {} },
    { method: "GET", url: "/api/cards/duplicates" },
  ] as const) assert.equal((await app.inject(request)).statusCode, 401);
  const invalidId = await app.inject({ method: "GET", url: "/api/cards/not-an-id", headers: { cookie } });
  assert.equal(invalidId.statusCode, 400);
  assert.equal(invalidId.json().error.code, "INVALID_CARD_ID");
  const invalidCreate = await app.inject({ method: "POST", url: "/api/cards", headers: { cookie }, payload: {} });
  assert.equal(invalidCreate.statusCode, 400);
  assert.equal(invalidCreate.json().error.code, "INVALID_REQUEST");
  await app.close();
});
