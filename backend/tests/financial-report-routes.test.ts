import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildApp } from "../src/app.js";
import { signSession, sessionCookie } from "../src/auth.js";
import { registerFinancialReportRoutes } from "../src/financial-report-routes.js";
import { createMcpServer } from "../src/mcp/tools.js";
import { FinancialReportService } from "../src/services/financial-report-service.js";
import type { AuthRepository } from "../src/auth-repository.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

const secret = "01234567890123456789012345678901";
const user = { id: "user-a", email: "user@example.test", passwordHash: "", role: "user" as const, workspaceId: "workspace-a", displayName: "User", active: true, lockedAt: null };
const users = { findUserById: async (id: string) => id === user.id ? user : null } as unknown as AuthRepository;
const cookie = sessionCookie(signSession({ userId: user.id, email: user.email, role: user.role, workspaceId: user.workspaceId }, secret));
const mcpContext: ServiceContext = { workspaceId: user.workspaceId, userId: user.id, role: user.role, channel: "mcp", correlationId: "report-range-test" };

const callMcpSummary = async (args: Record<string, unknown>) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "report-range-test", version: "1.0.0" });
  const server = createMcpServer(mcpContext);
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const result = await client.callTool({ name: "get_personal_finance_summary", arguments: args });
  const content = result.content as Array<{ type?: string; text?: string }>;
  await client.close();
  await server.close();
  return JSON.parse(content[0]?.text ?? "null") as unknown;
};

test("REST report summary resolves current-month defaults through the shared range", async (t) => {
  const observed: Array<{ from: string; to: string }> = [];
  t.mock.method(FinancialReportService, "summary", async (context: ServiceContext, range: { from: string; to: string }) => {
    assert.equal(context.workspaceId, user.workspaceId);
    observed.push(range);
    return { range } as never;
  });
  const app = buildApp({ isReady: () => true }, "silent");
  registerFinancialReportRoutes(app, secret, users);
  const response = await app.inject({ url: "/api/financial-reports/summary", headers: { cookie } });
  assert.equal(response.statusCode, 200);
  const today = new Date().toISOString().slice(0, 10);
  assert.deepEqual(observed, [{ from: `${today.slice(0, 7)}-01`, to: today }]);
  await app.close();
});

test("REST report summary rejects malformed, reversed and extra date filters", async (t) => {
  const summary = t.mock.method(FinancialReportService, "summary", async () => ({}) as never);
  const app = buildApp({ isReady: () => true }, "silent");
  registerFinancialReportRoutes(app, secret, users);
  for (const query of [
    "?from=2026-02-30&to=2026-03-01",
    "?from=2026-09-01&to=2026-08-31",
    "?from=2026-08-01&to=2026-08-31&ownerId=owner-a",
  ]) {
    const response = await app.inject({ url: `/api/financial-reports/summary${query}`, headers: { cookie } });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "INVALID_DATE_RANGE");
  }
  assert.equal(summary.mock.callCount(), 0);
  await app.close();
});

test("REST and MCP report adapters pass one canonical explicit date range", async (t) => {
  const observed: Array<{ from: string; to: string }> = [];
  t.mock.method(FinancialReportService, "summary", async (_context: ServiceContext, range: { from: string; to: string }) => {
    observed.push(range);
    return { range } as never;
  });
  const app = buildApp({ isReady: () => true }, "silent");
  registerFinancialReportRoutes(app, secret, users);
  const range = { from: "2026-08-01", to: "2026-08-16" };
  const rest = await app.inject({ url: `/api/financial-reports/summary?from=${range.from}&to=${range.to}`, headers: { cookie } });
  const mcp = await callMcpSummary(range);
  assert.equal(rest.statusCode, 200);
  assert.deepEqual(rest.json().data.range, range);
  assert.deepEqual(mcp, { range });
  assert.deepEqual(observed, [range, range]);
  await app.close();
});
