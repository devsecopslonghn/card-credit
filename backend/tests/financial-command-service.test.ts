import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { FinancialTransactionService } from "../src/services/financial-transaction-service.js";
import { AccountModel } from "../src/models/account.js";
import { FinancialTransactionModel } from "../src/models/financial-transaction.js";
import { McpMutationModel } from "../src/models/mcp-mutation.js";
import { commandGuardService, type CommandGuardSpec } from "../src/services/command-guard-service.js";
import { legacyPayloadHash } from "../src/command-hash.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

const context: ServiceContext = { workspaceId: "workspace-a", userId: "user-a", role: "user", channel: "browser", correlationId: "transaction-command-test" };
const input = { accountId: "account-1", transactionDate: "2026-08-16", amount: 1000 };
const query = <T>(value: T) => ({ session() { return this; }, lean: async () => value });

test("technical adjustment preview exposes zero service fee and balance snapshot delta", async (t) => {
  t.mock.method(AccountModel, "findOne", () => ({ lean: async () => ({ _id: "cash", type: "CASH", openingBalance: 47_314_918 }) }) as never);
  t.mock.method(FinancialTransactionModel, "find", () => ({ lean: async () => [] }) as never);
  const result = await FinancialTransactionService.preview(context, { items: [{ accountId: "cash", transactionDate: "2026-08-20", amount: 16_314_918, transactionType: "BALANCE_ADJUSTMENT", direction: "DECREASE" }] });
  const item = result.items[0] as typeof result.items[number] & Record<string, unknown>;
  assert.equal(item.serviceFee, 0);
  assert.equal(item.technicalAdjustment, true);
  assert.equal(item.balanceBefore, 47_314_918);
  assert.equal(item.balanceAfter, 31_000_000);
  assert.equal(item.balanceDelta, -16_314_918);
  assert.deepEqual(item.previewImpact, { grossAmount: 0, personalSpending: 0, debitCashflow: 0, creditDebt: 0, outstandingReceivable: 0, reimbursementReceived: 0 });
});

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
