import assert from "node:assert/strict";
import test from "node:test";
import { parseAuthSessionListResponse, parseAuthSessionResponse } from "../lib/api/authSessionCore.mjs";

const session = { email: "user@example.test", role: "user", workspaceId: "workspace-a" };

test("auth session frontend parsers consume canonical response envelopes", () => {
  assert.deepEqual(parseAuthSessionResponse({ user: session }), { user: session });
  assert.deepEqual(parseAuthSessionListResponse({ users: [session] }), { users: [session] });
});

test("auth session frontend parsers reject identity leakage and malformed envelopes", () => {
  assert.throws(() => parseAuthSessionResponse({ user: { ...session, userId: "secret" } }));
  assert.throws(() => parseAuthSessionResponse({ user: { ...session, role: "owner" } }));
  assert.throws(() => parseAuthSessionListResponse({ user: session }));
});
