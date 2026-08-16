import assert from "node:assert/strict";
import test from "node:test";
import { statementListSchema, statementPaymentInputSchema } from "../src/index.js";

const transaction = {
  id: "tx-1", accountId: "account-1", statementId: "statement-1", reimbursementForTransactionId: null,
  accountType: "CREDIT", transactionType: "EXPENSE", ownership: "PERSONAL", amount: 1_000_000,
  serviceFeeRate: null, categoryId: "food", transactionDate: "2026-08-01", note: "Lunch",
  impact: { personalSpending: 1_000_000, debitCashflow: 0, creditDebt: 1_000_000, outstandingReceivable: 0, reimbursementReceived: 0 },
};
const statement = {
  id: "statement-1", cardId: "card-1", periodStartDate: "2026-07-12", periodEndDate: "2026-08-11",
  statementDate: "2026-08-11", paymentDueDate: "2026-08-26", statementDaySnapshot: 11,
  paymentDueDaysSnapshot: 15, paymentStatus: "OPEN", effectivePaymentStatus: "OPEN", paidAt: null, paidAmount: null,
  summary: { statementAmount: 1_000_000, paymentAmount: 0, outstandingAmount: 1_000_000, personalSpending: 1_000_000, outstandingReceivable: 0, reimbursementReceived: 0, transactionCount: 1 },
  transactions: [transaction],
};

test("statement read DTO keeps persisted-impact totals and nested transactions", () => {
  assert.deepEqual(statementListSchema.parse([statement]), [statement]);
  assert.throws(() => statementListSchema.parse([{ ...statement, summary: { ...statement.summary, outstandingAmount: -1 } }]));
  assert.throws(() => statementListSchema.parse([{ ...statement, paymentDueDate: "2026-02-30" }]));
});

test("statement payment input is strict and never defaults an unknown action", () => {
  assert.deepEqual(statementPaymentInputSchema.parse({ action: "PAID", repaymentAccountId: " account-1 " }), { action: "PAID", repaymentAccountId: "account-1" });
  assert.throws(() => statementPaymentInputSchema.parse({}));
  assert.throws(() => statementPaymentInputSchema.parse({ action: "INVALID" }));
  assert.throws(() => statementPaymentInputSchema.parse({ action: "PAID", unexpected: true }));
});
