import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { signSession, sessionCookie } from "../src/auth.js";
import { registerTransactionRoutes } from "../src/transaction-routes.js";
import { registerFinancialTransactionRoutes } from "../src/financial-transaction-routes.js";
import { StatementPaymentCommandService, nextPaymentState, paidLedgerIsConsistent, paymentTotals } from "../src/services/statement-payment-command-service.js";
import { FinancialTransactionService } from "../src/services/financial-transaction-service.js";
import { StatementQueryService } from "../src/services/statement-query-service.js";
import { FinancialTransactionModel } from "../src/models/financial-transaction.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

const secret = "01234567890123456789012345678901";
const cardId = "507f1f77bcf86cd799439011";
const statementId = "507f1f77bcf86cd799439021";
const user = { id: "user-a", email: "user@example.test", passwordHash: "", role: "user" as const, workspaceId: "workspace-a", displayName: "User", active: true, lockedAt: null };
const cookie = sessionCookie(signSession({ userId: user.id, email: user.email, role: user.role, workspaceId: user.workspaceId }, secret));

test("payment totals use persisted credit impact rather than raw amount", () => {
  assert.deepEqual(paymentTotals([
    { transactionType: "EXPENSE", amount: 1_000, creditDebt: 1_000 },
    { transactionType: "REFUND", amount: 100, creditDebt: -100 },
    { transactionType: "STATEMENT_PAYMENT", amount: 300, creditDebt: -300 },
  ]), { statementAmount: 1_000, paymentAmount: 400, outstandingAmount: 600 });
});

test("paid ledger consistency supports zero-payment statements and rejects partial paid state", () => {
  assert.equal(paidLedgerIsConsistent({ paidAmount: 0 }, []), true);
  assert.equal(paidLedgerIsConsistent({ paidAmount: 500 }, [{ transactionType: "STATEMENT_PAYMENT", amount: 400, creditDebt: -400 }]), false);
  assert.equal(paidLedgerIsConsistent({ paidAmount: 400 }, [{ transactionType: "STATEMENT_PAYMENT", amount: 400, creditDebt: -400 }]), true);
});

test("financial transaction model declares one payment transaction per workspace statement", () => {
  const indexes = FinancialTransactionModel.schema.indexes() as Array<[Record<string, unknown>, { name?: string; [key: string]: unknown }]>;
  const index = indexes.find(([, options]) => options.name === "statement_payment_unique");
  assert.deepEqual(index, [
    { workspaceId: 1, statementId: 1, transactionType: 1 },
    {
      name: "statement_payment_unique",
      unique: true,
      partialFilterExpression: { transactionType: "STATEMENT_PAYMENT", statementId: { $type: "objectId" } },
    },
  ]);
});

test("payment state transitions keep PAID locked and reopen only a closed statement", () => {
  assert.equal(nextPaymentState("OPEN", "CLOSED"), "STATEMENT_CLOSED");
  assert.equal(nextPaymentState("STATEMENT_CLOSED", "REOPEN"), "OPEN");
  assert.equal(nextPaymentState("OVERDUE", "CLOSED"), "STATEMENT_CLOSED");
  assert.equal(nextPaymentState("OPEN", "PAID"), "PAID");
  assert.throws(() => nextPaymentState("PAID", "CLOSED"), (error: unknown) => error instanceof Error && "code" in error && error.code === "STATEMENT_PAID_LOCKED");
  assert.throws(() => nextPaymentState("PAID", "REOPEN"), (error: unknown) => error instanceof Error && "code" in error && error.code === "STATEMENT_PAID_LOCKED");
});

test("canonical payment service rejects invalid runtime actions before database access", async () => {
  await assert.rejects(
    StatementPaymentCommandService.execute(
      { userId: user.id, workspaceId: user.workspaceId, role: user.role, channel: "browser", correlationId: "payment-test" },
      cardId,
      statementId,
      { action: "UNKNOWN" } as never,
    ),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "INVALID_PAYMENT_ACTION",
  );
  assert.throws(() => nextPaymentState("OPEN", "UNKNOWN" as never), (error: unknown) => error instanceof Error && "code" in error && error.code === "INVALID_PAYMENT_ACTION");
});

test("generic transaction preview rejects statement payment instead of advertising an executable command", async () => {
  await assert.rejects(
    FinancialTransactionService.preview(
      { userId: user.id, workspaceId: user.workspaceId, role: user.role, channel: "mcp", correlationId: "preview-test" },
      { items: [{ accountId: cardId, statementId, transactionDate: "2026-08-16", amount: 100, transactionType: "STATEMENT_PAYMENT" }] } as never,
    ),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "STATEMENT_PAYMENT_COMMAND_REQUIRED",
  );
});

test("payment REST adapter rejects missing/unknown action and delegates canonical payload", async (t) => {
  const observed: Array<{ context: ServiceContext; cardId: string; statementId: string; input: unknown }> = [];
  t.mock.method(StatementPaymentCommandService, "execute", async (context: ServiceContext, requestedCardId: string, requestedStatementId: string, input: unknown) => {
    observed.push({ context, cardId: requestedCardId, statementId: requestedStatementId, input });
    return { _id: statementId, userCardId: cardId };
  });
  t.mock.method(StatementQueryService, "get", async () => ({
    id: statementId, cardId, periodStartDate: "2026-07-12", periodEndDate: "2026-08-11", statementDate: "2026-08-11", paymentDueDate: "2026-08-26", statementDaySnapshot: 11, paymentDueDaysSnapshot: 15,
    paymentStatus: "PAID", effectivePaymentStatus: "PAID", paidAt: "2026-08-16T00:00:00.000Z", paidAmount: 600,
    summary: { statementAmount: 1_000, paymentAmount: 600, outstandingAmount: 400, personalSpending: 1_000, outstandingReceivable: 0, reimbursementReceived: 0, transactionCount: 1 },
  }));
  const app = buildApp({ isReady: () => true }, "silent");
  registerTransactionRoutes(app, secret);
  registerFinancialTransactionRoutes(app, secret);
  for (const payload of [{}, { action: "UNKNOWN" }, { action: "PAID", unexpected: true }]) {
    const response = await app.inject({ method: "PATCH", url: `/api/cards/${cardId}/statements/${statementId}/payment`, headers: { cookie }, payload });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "INVALID_PAYMENT_ACTION");
  }
  const response = await app.inject({ method: "PATCH", url: `/api/cards/${cardId}/statements/${statementId}/payment`, headers: { cookie }, payload: { action: "PAID", repaymentAccountId: "507f1f77bcf86cd799439031" } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data.id, statementId);
  assert.equal(observed.length, 1);
  assert.deepEqual(observed[0]?.input, { action: "PAID", repaymentAccountId: "507f1f77bcf86cd799439031" });
  assert.equal(observed[0]?.context.workspaceId, user.workspaceId);

  const genericPayment = await app.inject({
    method: "POST",
    url: "/api/financial-transactions",
    headers: { cookie, "idempotency-key": "statement-generic-1" },
    payload: { accountId: cardId, statementId, transactionDate: "2026-08-16", amount: 100, transactionType: "STATEMENT_PAYMENT" },
  });
  assert.equal(genericPayment.statusCode, 409);
  assert.equal(genericPayment.json().error.code, "STATEMENT_PAYMENT_COMMAND_REQUIRED");
  await app.close();
});
