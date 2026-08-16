import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../src/mcp/tools.js";
import { FeeQueryService } from "../src/services/fee-query-service.js";
import { MonthlyCashbackQueryService } from "../src/services/monthly-cashback-query-service.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

const context: ServiceContext = {
  workspaceId: "workspace-a",
  userId: "user-a",
  role: "user",
  channel: "mcp",
  correlationId: "mcp-test",
};

const call = async (name: string, args: Record<string, unknown>) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "read-tools-test", version: "1.0.0" });
  const server = createMcpServer(context);
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const result = await client.callTool({ name, arguments: args });
  const content = result.content as Array<{ type?: string; text?: string }>;
  await client.close();
  await server.close();
  const text = content[0]?.type === "text" ? content[0].text ?? "" : "";
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Unexpected MCP text: ${text}`);
  }
};

test("MCP fee and cashback read tools delegate trusted context and canonical DTOs", async (t) => {
  const cardFee = t.mock.method(FeeQueryService, "listCardPayments", async (ctx: ServiceContext, cardId: string) => {
    assert.equal(ctx.workspaceId, "workspace-a");
    assert.equal(ctx.userId, "user-a");
    assert.equal(ctx.channel, "mcp");
    assert.notEqual(ctx.correlationId, "mcp-test");
    assert.equal(cardId, "507f1f77bcf86cd799439011");
    return [{ id: "fee-1", cardId, category: "ANNUAL_CARD_FEE", paymentDate: "2026-08-01", amount: 299000, note: "" }];
  });
  const feeCenter = t.mock.method(FeeQueryService, "listCenter", async (ctx: ServiceContext, options: { cardId?: string; category?: "MANAGEMENT_FEE" }) => {
    assert.equal(ctx.workspaceId, "workspace-a");
    assert.deepEqual(options, { category: "MANAGEMENT_FEE" });
    return [{ id: "fee-2", cardId: "card-orphan", category: "MANAGEMENT_FEE", paymentDate: "2026-08-02", amount: 50000, note: "", card: null }];
  });
  const cashback = t.mock.method(MonthlyCashbackQueryService, "list", async (ctx: ServiceContext, cardId: string, year: string) => {
    assert.equal(ctx.workspaceId, "workspace-a");
    assert.equal(cardId, "507f1f77bcf86cd799439011");
    assert.equal(year, "2026");
    return [{ id: "cb-1", cardId, period: "2026-08", expectedAmount: 100000, actualAmount: null, status: "REJECTED", receivedAt: null, note: "" }];
  });

  assert.deepEqual(await call("list_card_fee_payments", { cardId: "507f1f77bcf86cd799439011" }), [
    { id: "fee-1", cardId: "507f1f77bcf86cd799439011", category: "ANNUAL_CARD_FEE", paymentDate: "2026-08-01", amount: 299000, note: "" },
  ]);
  assert.deepEqual(await call("list_fee_center", { category: "MANAGEMENT_FEE" }), [
    { id: "fee-2", cardId: "card-orphan", category: "MANAGEMENT_FEE", paymentDate: "2026-08-02", amount: 50000, note: "", card: null },
  ]);
  assert.deepEqual(await call("list_monthly_cashbacks", { cardId: "507f1f77bcf86cd799439011", year: "2026" }), [
    { id: "cb-1", cardId: "507f1f77bcf86cd799439011", period: "2026-08", expectedAmount: 100000, actualAmount: null, status: "REJECTED", receivedAt: null, note: "" },
  ]);
  assert.equal(cardFee.mock.callCount(), 1);
  assert.equal(feeCenter.mock.callCount(), 1);
  assert.equal(cashback.mock.callCount(), 1);
});

test("MCP read tool schemas reject tenant fields and malformed year", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "schema-test", version: "1.0.0" });
  const server = createMcpServer(context);
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const tenantInput = await client.callTool({ name: "list_card_fee_payments", arguments: { cardId: "card-1", workspaceId: "workspace-b" } });
  assert.equal(tenantInput.isError, true);
  const malformedYear = await client.callTool({ name: "list_monthly_cashbacks", arguments: { cardId: "card-1", year: "26" } });
  assert.equal(malformedYear.isError, true);
  await client.close();
  await server.close();
});
