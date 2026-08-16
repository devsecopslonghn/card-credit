import assert from "node:assert/strict";
import test from "node:test";
import { parseUserListResponse, parseUserResponse } from "../lib/api/userCore.mjs";

const user = { id: "user-1", email: "user@example.test", role: "user", workspaceId: "workspace-a", displayName: "User", active: true, lockedAt: null };

test("user frontend parsers consume canonical profile and admin list responses", () => {
  assert.deepEqual(parseUserResponse({ user }), { user });
  assert.deepEqual(parseUserListResponse({ users: [user] }), { users: [user] });
});

test("user frontend parsers reject secrets, malformed dates and missing envelopes", () => {
  assert.throws(() => parseUserResponse({ user: { ...user, passwordHash: "secret" } }));
  assert.throws(() => parseUserResponse({ user: { ...user, lockedAt: "2026-08-16" } }));
  assert.throws(() => parseUserListResponse({ data: [user] }));
});
