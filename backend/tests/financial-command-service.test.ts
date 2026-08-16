import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { FinancialTransactionService } from "../src/services/financial-transaction-service.js";
import { McpMutationModel } from "../src/models/mcp-mutation.js";
import { commandGuardService, type CommandGuardSpec } from "../src/services/command-guard-service.js";
import { legacyPayloadHash } from "../src/command-hash.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

const context: ServiceContext = { workspaceId: "workspace-a", userId: "user-a", role: "user", channel: "browser", correlationId: "transaction-command-test" };
const input = { accountId: "account-1", transactionDate: "2026-08-16", amount: 1000 };
const query = <T>(value: T) => ({ session() { return this; }, lean: async () => value });

test("financial transaction command computes its hash and delegates to the persistent guard", async (t) => {
  t.mock.method(McpMutationModel, "findOne", () => query(null) as never);
  let observed: CommandGuardSpec | undefined;
  t.mock.method(commandGuardService, "execute", async (_ctx: ServiceContext, spec: CommandGuardSpec) => {
    observed = spec;
    return { id: "transaction-1" } as never;
  });
  const result = await FinancialTransactionService.create(context, input, { idempotencyKey: "transaction-command-1", endpointOrTool: "POST /api/financial-transactions" });
  assert.deepEqual(result, { id: "transaction-1" });
  assert.equal(observed?.operation, "import_financial_transaction");
  assert.equal(observed?.endpointOrTool, "POST /api/financial-transactions");
  assert.equal(observed?.idempotencyKey, "transaction-command-1");
  assert.match(observed?.payloadHash ?? "", /^[a-f0-9]{64}$/);
});

test("financial transaction command replays a legacy receipt inside the guard callback", async (t) => {
  t.mock.method(McpMutationModel, "findOne", () => query({ payloadHash: legacyPayloadHash(input), result: { id: "legacy-transaction" } }) as never);
  t.mock.method(commandGuardService, "execute", async (_ctx: ServiceContext, _spec: CommandGuardSpec, work: (session: mongoose.ClientSession) => Promise<unknown>) => work({} as mongoose.ClientSession));
  const result = await FinancialTransactionService.create(context, input, { idempotencyKey: "legacy-transaction-1", endpointOrTool: "confirm_import_financial_transaction" });
  assert.deepEqual(result, { id: "legacy-transaction" });
});
