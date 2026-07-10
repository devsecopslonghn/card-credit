import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { sessionCookie, signSession } from "../src/auth.js";
import { InMemoryMasterdataRepository } from "../src/masterdata.js";
import { registerMasterdataRoutes } from "../src/masterdata-routes.js";
const secret = "01234567890123456789012345678901";
const cookie = (role: string) => sessionCookie(signSession({ userId: "u", email: "u@example.test", role, workspaceId: "w" }, secret));
test("masterdata reads require auth and writes require admin with duplicate checks", async () => { const repo = new InMemoryMasterdataRepository(); const app = buildApp({ isReady: () => true }, "silent"); registerMasterdataRoutes(app, repo, secret); assert.equal((await app.inject({ url: "/api/banks" })).statusCode, 401); assert.equal((await app.inject({ method: "POST", url: "/api/banks", headers: { cookie: cookie("user") }, payload: { shortname: "TST" } })).statusCode, 403); assert.equal((await app.inject({ method: "POST", url: "/api/banks", headers: { cookie: cookie("admin") }, payload: { shortname: "TST", name: "Test", fullname: "Test Bank", logo: "logo" } })).statusCode, 201); assert.equal((await app.inject({ method: "POST", url: "/api/banks", headers: { cookie: cookie("admin") }, payload: { shortname: "tst" } })).statusCode, 400); assert.equal((await app.inject({ url: "/api/banks", headers: { cookie: cookie("user") } })).json().length, 1); assert.equal((await app.inject({ method: "POST", url: "/api/cardtypes", headers: { cookie: cookie("admin") }, payload: { name: "Visa", logo: "logo" } })).statusCode, 201); await app.close(); });
