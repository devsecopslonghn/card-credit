import assert from "node:assert/strict";
import test from "node:test";
import { FinancialReportService } from "../src/services/financial-report-service.js";
import { StatementQueryService } from "../src/services/statement-query-service.js";
import { FinancialTransactionModel } from "../src/models/financial-transaction.js";
import { AccountModel } from "../src/models/account.js";
import { MonthlyCardCashbackModel } from "../src/models/monthly-card-cashback.js";
import { CardFeePaymentModel } from "../src/models/card-fee-payment.js";
import { CardStatementModel } from "../src/models/card-statement.js";
import { CreditCardModel } from "../src/models/credit-card.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

const context: ServiceContext = { workspaceId: "workspace-a", userId: "user-a", role: "user", channel: "browser", correlationId: "report-test" };
const statement = {
  id: "507f1f77bcf86cd799439021", cardId: "507f1f77bcf86cd799439011", periodStartDate: "2026-07-01", periodEndDate: "2026-07-31",
  statementDate: "2026-07-31", paymentDueDate: "2026-08-15", statementDaySnapshot: 31, paymentDueDaysSnapshot: 15,
  paymentStatus: "OPEN", effectivePaymentStatus: "OPEN", paidAt: null, paidAmount: null,
  summary: { statementAmount: 600_000, paymentAmount: 100_000, outstandingAmount: 500_000, personalSpending: 600_000, outstandingReceivable: 25_000, reimbursementReceived: 75_000, transactionCount: 2 },
  transactions: [],
};

const chain = <T>(value: T) => {
  const query = { select: () => query, lean: async () => value };
  return query;
};

test("summary reads benefit sources once, keeps ledger groups stable and avoids cashback double count", async (t) => {
  const transactions = [
    { _id: "tx-personal", accountId: "account-credit", accountType: "CREDIT", transactionType: "EXPENSE", ownership: "PERSONAL", categoryId: "food", amount: 1_000, reimbursementExpected: 0, cashbackReceived: 10, personalSpending: 1_000, debitCashflow: 0, creditDebt: 1_000, outstandingReceivable: 0, reimbursementReceived: 0 },
    { _id: "tx-fee", accountId: "account-credit", accountType: "CREDIT", transactionType: "EXPENSE", ownership: "PAID_FOR_OTHER", categoryId: "other", amount: 500, reimbursementExpected: 400, refundReceived: 25, cashbackReceived: 0, personalSpending: 75, debitCashflow: 0, creditDebt: 500, outstandingReceivable: 400, reimbursementReceived: 0 },
    { _id: "tx-payment", accountId: "account-debit", accountType: "DEBIT", transactionType: "STATEMENT_PAYMENT", ownership: "PERSONAL", categoryId: "OTHER", amount: 200, reimbursementExpected: 0, cashbackReceived: 0, personalSpending: 0, debitCashflow: -200, creditDebt: -200, outstandingReceivable: 0, reimbursementReceived: 0 },
  ];
  const transactionFind = t.mock.method(FinancialTransactionModel, "find", (query: Record<string, unknown>) => chain(query.transactionType === "REIMBURSEMENT" ? [{ amount: 100 }] : transactions) as never);
  t.mock.method(AccountModel, "find", () => chain([
    { _id: "account-credit", name: "Credit", type: "CREDIT", openingBalance: 0 },
    { _id: "account-debit", name: "Debit", type: "DEBIT", openingBalance: 0 },
  ]) as never);
  const cashbackFind = t.mock.method(MonthlyCardCashbackModel, "find", () => chain([
    { expectedAmount: 100, actualAmount: null, status: "PENDING" },
    { expectedAmount: 200, actualAmount: 150, status: "RECEIVED" },
    { expectedAmount: 300, actualAmount: 400, status: "REJECTED" },
  ]) as never);
  const feeFind = t.mock.method(CardFeePaymentModel, "find", () => chain([
    { category: "ANNUAL_CARD_FEE", amount: 40 },
    { category: "MANAGEMENT_FEE", amount: 60 },
    { category: "BANK_CASHBACK", amount: 900 },
  ]) as never);

  const result = await FinancialReportService.summary(context, { from: "2026-07-01", to: "2026-07-31" });

  assert.equal(result.totals.totalServiceFee, 75);
  assert.equal(result.totals.transactionCashbackActual, 10);
  assert.equal(result.totals.monthlyBankCashbackExpected, 600);
  assert.equal(result.totals.monthlyBankCashbackActual, 150);
  assert.equal(result.totals.monthlyBankCashbackRejected, 300);
  assert.equal(result.totals.totalPaidCardFees, 100);
  assert.equal(result.totals.actualNetBenefit, -25);
  assert.equal(result.totals.creditDebt, 1_300);
  assert.equal(result.creditDebtBalance, 1_300);
  assert.equal(result.byAccount["account-credit"]?.transactionCount, 2);
  assert.equal(transactionFind.mock.callCount(), 2);
  assert.deepEqual(transactionFind.mock.calls[0]?.arguments[0], { workspaceId: "workspace-a", transactionDate: { $gte: "2026-07-01", $lte: "2026-07-31" } });
  assert.deepEqual(cashbackFind.mock.calls[0]?.arguments[0], { workspaceId: "workspace-a", period: { $gte: "2026-07", $lte: "2026-07" } });
  assert.deepEqual(feeFind.mock.calls[0]?.arguments[0], { workspaceId: "workspace-a", paymentDate: { $gte: "2026-07-01", $lte: "2026-07-31" }, category: { $in: ["ANNUAL_CARD_FEE", "MANAGEMENT_FEE", "OTHER_FEE"] } });
});

test("summary owner filter scopes ledger, cashback and fee sources by card references", async (t) => {
  const cardIds = ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"];
  const cardFind = t.mock.method(CreditCardModel, "find", () => chain(cardIds.map((_id) => ({ _id }))) as never);
  const accountFind = t.mock.method(AccountModel, "find", (query: Record<string, unknown>) => chain(query.creditCardId ? [{ _id: "account-card" }] : []) as never);
  const statementFind = t.mock.method(CardStatementModel, "find", () => chain([{ _id: "statement-card" }]) as never);
  const transactionFind = t.mock.method(FinancialTransactionModel, "find", () => chain([]) as never);
  const cashbackFind = t.mock.method(MonthlyCardCashbackModel, "find", () => chain([]) as never);
  const feeFind = t.mock.method(CardFeePaymentModel, "find", () => chain([]) as never);

  await FinancialReportService.summary(context, { from: "2026-08-01", to: "2026-08-31" }, { owner: "Tôi" });

  assert.deepEqual(cardFind.mock.calls[0]?.arguments[0], { workspaceId: "workspace-a", owner: "Tôi" });
  assert.deepEqual(accountFind.mock.calls[0]?.arguments[0], { workspaceId: "workspace-a", active: { $ne: false }, creditCardId: { $in: cardIds } });
  assert.deepEqual(statementFind.mock.calls[0]?.arguments[0], { workspaceId: "workspace-a", userCardId: { $in: cardIds } });
  assert.deepEqual(transactionFind.mock.calls[0]?.arguments[0], {
    workspaceId: "workspace-a",
    transactionDate: { $gte: "2026-08-01", $lte: "2026-08-31" },
    $or: [{ accountId: { $in: ["account-card"] } }, { statementId: { $in: ["statement-card"] } }],
  });
  assert.deepEqual(cashbackFind.mock.calls[0]?.arguments[0], { workspaceId: "workspace-a", userCardId: { $in: cardIds }, period: { $gte: "2026-08", $lte: "2026-08" } });
  assert.deepEqual(feeFind.mock.calls[0]?.arguments[0], { workspaceId: "workspace-a", userCardId: { $in: cardIds }, paymentDate: { $gte: "2026-08-01", $lte: "2026-08-31" }, category: { $in: ["ANNUAL_CARD_FEE", "MANAGEMENT_FEE", "OTHER_FEE"] } });
  assert.equal(transactionFind.mock.callCount(), 1);
});

test("credit statement report delegates date range and canonicalizes persisted impact", async (t) => {
  const query = t.mock.method(StatementQueryService, "list", async (_ctx: ServiceContext, options: { statementDateFrom?: string; statementDateTo?: string; order?: "statementDate" | "paymentDueDate"; includeTransactions?: boolean }) => {
    assert.deepEqual(options, { statementDateFrom: "2026-07-01", statementDateTo: "2026-07-31", order: "paymentDueDate", includeTransactions: false });
    return [statement] as never;
  });
  const result = await FinancialReportService.creditStatements(context, { from: "2026-07-01", to: "2026-07-31" });
  assert.deepEqual(result, [{
    statementId: statement.id,
    statementDate: statement.statementDate,
    periodStartDate: statement.periodStartDate,
    periodEndDate: statement.periodEndDate,
    paymentDueDate: statement.paymentDueDate,
    paymentStatus: statement.paymentStatus,
    outstandingDebt: 500_000,
    grossCharges: 600_000,
    payments: 100_000,
    personalSpending: 600_000,
    outstandingReceivable: 25_000,
    transactionCount: 2,
  }]);
  assert.equal(query.mock.callCount(), 1);
});

test("credit statement report reads all canonical statements when no range is supplied", async (t) => {
  const query = t.mock.method(StatementQueryService, "list", async (_ctx: ServiceContext, options: { statementDateFrom?: string; statementDateTo?: string; order?: "statementDate" | "paymentDueDate"; includeTransactions?: boolean }) => {
    assert.deepEqual(options, { statementDateFrom: undefined, statementDateTo: undefined, order: "paymentDueDate", includeTransactions: false });
    return [];
  });
  assert.deepEqual(await FinancialReportService.creditStatements(context), []);
  assert.equal(query.mock.callCount(), 1);
});

test("summary rejects malformed and reversed date ranges before reading models", async () => {
  await assert.rejects(() => FinancialReportService.summary(context, { from: "2026-02-30", to: "2026-03-01" }));
  await assert.rejects(() => FinancialReportService.summary(context, { from: "2026-09-01", to: "2026-08-31" }));
});
