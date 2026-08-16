import assert from "node:assert/strict";
import test from "node:test";
import { browserServiceContext, jobServiceContext, mcpServiceContext, serviceContextFromSession } from "../src/context.js";
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

test("browser context derives identity from the signed session and rejects invalid metadata", () => {
  const secret = "01234567890123456789012345678901";
  const cookie = sessionCookie(signSession({ ...identity, email: "user@example.test" }, secret));
  const request = { id: "request-1", headers: { cookie } } as never;
  assert.deepEqual(browserServiceContext(request, secret), { ...identity, channel: "browser", correlationId: "request-1" });
  assert.throws(() => serviceContextFromSession({ ...identity, role: "owner" }, "browser", "request-1"), /Trusted role/);
  assert.throws(() => serviceContextFromSession(identity, "browser", "x".repeat(129)), /Correlation ID/);
});
