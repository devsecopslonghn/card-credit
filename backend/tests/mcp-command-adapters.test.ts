import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../src/mcp/tools.js";
import { canonicalPayloadHash, confirmationTokenHash, type PreviewTokenCodec } from "../src/mcp/preview.js";
import { AccountService } from "../src/services/account-service.js";
import { FinancialTransactionService } from "../src/services/financial-transaction-service.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

const context: ServiceContext = { workspaceId: "workspace-a", userId: "user-a", role: "user", channel: "mcp", correlationId: "mcp-command-test" };
const codec = {
  issue: () => ({ previewId: "00000000-0000-4000-8000-000000000001", confirmationToken: "token", expiresAt: 1, expiresInSeconds: 300 }),
  verify: (token: string) => { assert.equal(token, "token"); return { previewId: "00000000-0000-4000-8000-000000000001" }; },
} as unknown as PreviewTokenCodec;

const call = async (name: string, args: Record<string, unknown>) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "command-adapter-test", version: "1.0.0" });
  const server = createMcpServer(context, codec);
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const result = await client.callTool({ name, arguments: args });
  const content = result.content as Array<{ type?: string; text?: string }>;
  await client.close();
  await server.close();
  return JSON.parse(content[0]?.text ?? "null") as unknown;
};

test("MCP account confirm forwards the fixed command invocation", async (t) => {
  const create = t.mock.method(AccountService, "create", async (_ctx: ServiceContext, _payload: Record<string, unknown>, invocation: { idempotencyKey: string; endpointOrTool: string; previewId?: string; confirmationTokenHash?: string }) => {
    assert.deepEqual(invocation, { idempotencyKey: "account-command-1", endpointOrTool: "confirm_create_account", previewId: "00000000-0000-4000-8000-000000000001", confirmationTokenHash: confirmationTokenHash("token"), previewPayloadHash: canonicalPayloadHash({ name: "Cash", type: "CASH", openingBalance: 0 }) });
    return { id: "account-1" } as never;
  });
  const payload = { name: "Cash", type: "CASH", openingBalance: 0 };
  assert.deepEqual(await call("confirm_create_account", { payload, confirmationToken: "token", idempotencyKey: "account-command-1" }), { id: "account-1" });
  assert.equal(create.mock.callCount(), 1);
});

test("MCP transaction batch confirm forwards the fixed command invocation", async (t) => {
  const createBatch = t.mock.method(FinancialTransactionService, "createBatch", async (_ctx: ServiceContext, _payload: Record<string, unknown>, invocation: { idempotencyKey: string; endpointOrTool: string; previewId?: string; confirmationTokenHash?: string }) => {
    assert.deepEqual(invocation, { idempotencyKey: "transaction-command-1", endpointOrTool: "confirm_import_financial_transaction", previewId: "00000000-0000-4000-8000-000000000001", confirmationTokenHash: confirmationTokenHash("token"), previewPayloadHash: canonicalPayloadHash({ items: [{ accountId: "account-1", transactionDate: "2026-08-16", amount: 1000 }] }) });
    return { count: 1, items: [] };
  });
  const payload = { items: [{ accountId: "account-1", transactionDate: "2026-08-16", amount: 1000 }] };
  assert.deepEqual(await call("confirm_import_financial_transaction", { payload, confirmationToken: "token", idempotencyKey: "transaction-command-1" }), { count: 1, items: [] });
  assert.equal(createBatch.mock.callCount(), 1);
});
