import assert from "node:assert/strict";
import test from "node:test";
import { browserActorContext, browserServiceContext, jobServiceContext, mcpServiceContext, serviceContextFromSession } from "../src/context.js";
import { revalidateMcpContext } from "../src/mcp/context.js";
import { sessionCookie, signSession } from "../src/auth.js";

const identity = { workspaceId: "workspace-1", userId: "user-1", role: "admin" } as const;

test("service context records trusted channel and correlation id", () => {
  assert.deepEqual(serviceContextFromSession(identity, "browser", "request-1"), {
    ...identity,
    channel: "browser",
    correlationId: "request-1",
  });
  assert.equal(mcpServiceContext(identity).channel, "mcp");
  assert.equal(jobServiceContext(identity, "job-1").correlationId, "job-1");
  assert.notEqual(mcpServiceContext(identity).correlationId, mcpServiceContext(identity).correlationId);
});

test("browser context derives identity from the signed session and rejects invalid metadata", async () => {
  const secret = "01234567890123456789012345678901";
  const cookie = sessionCookie(signSession({ ...identity, email: "user@example.test" }, secret));
  const request = { id: "request-1", headers: { cookie } } as never;
  assert.deepEqual(await browserServiceContext(request, secret), { ...identity, channel: "browser", correlationId: "request-1" });
  assert.throws(() => serviceContextFromSession({ ...identity, role: "owner" }, "browser", "request-1"), /Trusted role/);
  assert.throws(() => serviceContextFromSession(identity, "browser", "x".repeat(129)), /Correlation ID/);
});

test("browser context rejects an inactive or moved user when a repository is provided", async () => {
  const secret = "01234567890123456789012345678901";
  const cookie = sessionCookie(signSession({ ...identity, email: "user@example.test" }, secret));
  const request = { id: "request-1", headers: { cookie } } as never;
  const inactive = { findUserById: async () => ({ ...identity, id: identity.userId, email: "user@example.test", passwordHash: "unused", displayName: "User", active: false, lockedAt: null }) };
  await assert.rejects(() => browserServiceContext(request, secret, inactive), /không còn hợp lệ/);
});

test("browser actor context returns one safe audit actor with the trusted service context", async () => {
  const secret = "01234567890123456789012345678901";
  const cookie = sessionCookie(signSession({ ...identity, email: "authoritative@example.test" }, secret));
  const request = { id: "request-actor", headers: { cookie } } as never;
  let lookups = 0;
  const result = await browserActorContext(request, secret, { findUserById: async () => { lookups += 1; return { ...identity, id: identity.userId, email: "authoritative@example.test", passwordHash: "must-not-leak", displayName: "User", active: true, lockedAt: null }; } });
  assert.equal(lookups, 1);
  assert.deepEqual(result.actor, { userId: "user-1", email: "authoritative@example.test", role: "admin", workspaceId: "workspace-1" });
  assert.deepEqual(result.context, { ...identity, channel: "browser", correlationId: "request-actor" });
  assert.equal("passwordHash" in result.actor, false);
});

test("MCP context revalidates the fixed identity and workspace on each provider call", async () => {
  const context = mcpServiceContext(identity);
  const active = { findUserById: async () => ({ ...identity, id: identity.userId, email: "user@example.test", passwordHash: "unused", displayName: "User", active: true, lockedAt: null }) };
  const refreshed = await revalidateMcpContext(context, active);
  assert.equal(refreshed.channel, "mcp");
  assert.equal(refreshed.userId, identity.userId);
  assert.notEqual(refreshed.correlationId, context.correlationId);
  const moved = { findUserById: async () => ({ ...identity, id: identity.userId, workspaceId: "workspace-2", email: "user@example.test", passwordHash: "unused", displayName: "User", active: true, lockedAt: null }) };
  await assert.rejects(() => revalidateMcpContext(context, moved), /không còn hợp lệ/);
});
