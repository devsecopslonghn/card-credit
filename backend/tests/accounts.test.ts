import assert from "node:assert/strict";
import test from "node:test";
import { AccountService } from "../src/services/account-service.js";
import { AccountModel } from "../src/models/account.js";
import { CreditCardModel } from "../src/models/credit-card.js";
import { McpMutationModel } from "../src/models/mcp-mutation.js";
import type { ServiceContext } from "../src/services/types/service-context.js";
import { canonicalPayloadHash, legacyPayloadHash } from "../src/command-hash.js";

const context: ServiceContext = {
  workspaceId: "workspace-a",
  userId: "user-a",
  role: "user",
  channel: "browser",
  correlationId: "account-test",
};
const cardId = "507f1f77bcf86cd799439011";
const input = { name: "Credit account", type: "CREDIT" as const, creditCardId: cardId, openingBalance: 0 };
const query = <T>(value: T) => ({ lean: async () => value });

test("CREDIT account validates an active card in the same workspace before create", async (t) => {
  const cardFind = t.mock.method(CreditCardModel, "findOne", (filter: Record<string, unknown>) => {
    assert.deepEqual(filter, { _id: cardId, workspaceId: "workspace-a", active: { $ne: false } });
    return query({ _id: cardId, workspaceId: "workspace-a", active: true }) as never;
  });
  const accountCreate = t.mock.method(AccountModel, "create", async (value: Record<string, unknown>) => ({ _id: "507f1f77bcf86cd799439012", ...value }) as never);

  const result = await AccountService.create(context, input);

  assert.equal(result.creditCardId, cardId);
  assert.equal(cardFind.mock.callCount(), 1);
  assert.equal(accountCreate.mock.callCount(), 1);
});

test("CREDIT account rejects missing, inactive or cross-workspace cards without creating", async (t) => {
  const cardFind = t.mock.method(CreditCardModel, "findOne", () => query(null) as never);
  const accountCreate = t.mock.method(AccountModel, "create", async () => { throw new Error("account create must not run"); });

  await assert.rejects(() => AccountService.create(context, input), (error: { code?: string; statusCode?: number }) => error.code === "CARD_NOT_FOUND" && error.statusCode === 404);
  assert.equal(cardFind.mock.callCount(), 1);
  assert.equal(accountCreate.mock.callCount(), 0);
});

test("malformed CREDIT card id fails closed before card or account reads", async (t) => {
  const cardFind = t.mock.method(CreditCardModel, "findOne");
  const accountCreate = t.mock.method(AccountModel, "create");

  await assert.rejects(() => AccountService.create(context, { ...input, creditCardId: "not-an-object-id" }), (error: { code?: string; statusCode?: number }) => error.code === "INVALID_CARD_ID" && error.statusCode === 400);
  assert.equal(cardFind.mock.callCount(), 0);
  assert.equal(accountCreate.mock.callCount(), 0);
});

test("non-CREDIT card link remains a boundary error without card lookup", async (t) => {
  const cardFind = t.mock.method(CreditCardModel, "findOne");
  await assert.rejects(() => AccountService.create(context, { name: "Debit", type: "DEBIT", creditCardId: cardId, openingBalance: 0 }), (error: { code?: string; statusCode?: number }) => error.code === "INVALID_ACCOUNT" && error.statusCode === 400);
  assert.equal(cardFind.mock.callCount(), 0);
});

test("idempotent account replay returns the stored result before card validation", async (t) => {
  const hash = canonicalPayloadHash(input);
  const replayCardFind = t.mock.method(CreditCardModel, "findOne");
  const replayCreate = t.mock.method(AccountModel, "create");
  const stored = { id: "account-existing", name: input.name, type: "CREDIT", group: "DEBT", currency: "VND", active: true, creditCardId: cardId, openingBalance: 0, currentBalance: 0, currentDebt: 0 };
  t.mock.method(McpMutationModel, "findOne", () => query({ payloadHash: hash, result: stored }) as never);

  const result = await AccountService.create(context, input, "idempotency-1");
  assert.deepEqual(result, stored);
  assert.equal(replayCardFind.mock.callCount(), 0);
  assert.equal(replayCreate.mock.callCount(), 0);
});

test("idempotent account replay accepts a legacy McpMutation payload hash", async (t) => {
  const replayCardFind = t.mock.method(CreditCardModel, "findOne");
  const replayCreate = t.mock.method(AccountModel, "create");
  const stored = { id: "account-legacy", name: input.name, type: "CREDIT", group: "DEBT", currency: "VND", active: true, creditCardId: cardId, openingBalance: 0, currentBalance: 0, currentDebt: 0 };
  t.mock.method(McpMutationModel, "findOne", () => query({ payloadHash: legacyPayloadHash(input), result: stored }) as never);

  const result = await AccountService.create(context, input, "legacy-key");
  assert.deepEqual(result, stored);
  assert.equal(replayCardFind.mock.callCount(), 0);
  assert.equal(replayCreate.mock.callCount(), 0);
});
