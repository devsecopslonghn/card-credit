import assert from "node:assert/strict";
import test from "node:test";
import { planLegacyStatementPaymentRepairs } from "../src/finance-reconciliation.js";
import { FinancialReconciliationCaseModel } from "../src/models/financial-reconciliation-case.js";

const account = { _id: "507f1f77bcf86cd799439011", type: "DEBIT", active: true };
const statement = { _id: "507f1f77bcf86cd799439021", paymentStatus: "STATEMENT_CLOSED", paidAmount: null, paidAt: null };
const payment = { _id: "507f1f77bcf86cd799439031", statementId: "507f1f77bcf86cd799439021", transactionType: "STATEMENT_PAYMENT", amount: 1000, creditDebt: -1000, debitCashflow: -1000, personalSpending: 0, accountId: "507f1f77bcf86cd799439011", createdAt: "2026-08-15T10:00:00.000Z", transactionDate: "2026-08-15" };

test("legacy payment planner repairs only a fully settled non-PAID statement", () => {
  const plan = planLegacyStatementPaymentRepairs([
    statement,
  ], [
    { ...payment },
    { _id: "507f1f77bcf86cd799439041", statementId: "507f1f77bcf86cd799439021", transactionType: "EXPENSE", amount: 1000, creditDebt: 1000, accountId: "507f1f77bcf86cd799439051" },
  ], [account]);
  assert.equal(plan.repairs.length, 1);
  assert.match(plan.sourceHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(plan.repairs[0], {
    statementId: "507f1f77bcf86cd799439021",
    transactionId: "507f1f77bcf86cd799439031",
    accountId: "507f1f77bcf86cd799439011",
    amount: 1000,
    previousStatus: "STATEMENT_CLOSED",
    paidAt: new Date("2026-08-15T10:00:00.000Z"),
  });
  assert.equal(plan.skipped.length, 0);
});

test("legacy payment planner skips ambiguous, partial, paid and unsafe records", () => {
  const statements = [
    { _id: "507f1f77bcf86cd799439061", paymentStatus: "OPEN", paidAmount: null, paidAt: null },
    { _id: "507f1f77bcf86cd799439062", paymentStatus: "OPEN", paidAmount: null, paidAt: null },
    { _id: "507f1f77bcf86cd799439063", paymentStatus: "PAID", paidAmount: 1000, paidAt: "2026-08-15T10:00:00.000Z" },
    { _id: "507f1f77bcf86cd799439064", paymentStatus: "OPEN", paidAmount: null, paidAt: null },
    { _id: "507f1f77bcf86cd799439065", paymentStatus: "OVERDUE", paidAmount: null, paidAt: null },
  ];
  const transactions = [
    { ...payment, _id: "507f1f77bcf86cd799439071", statementId: "507f1f77bcf86cd799439061", amount: 900, creditDebt: -900, debitCashflow: -900 },
    { ...payment, _id: "507f1f77bcf86cd799439072", statementId: "507f1f77bcf86cd799439062" },
    { ...payment, _id: "507f1f77bcf86cd799439073", statementId: "507f1f77bcf86cd799439062" },
    { ...payment, _id: "507f1f77bcf86cd799439074", statementId: "507f1f77bcf86cd799439063" },
    { ...payment, _id: "507f1f77bcf86cd799439075", statementId: "507f1f77bcf86cd799439064", accountId: "507f1f77bcf86cd799439099" },
    { ...payment, _id: "507f1f77bcf86cd799439076", statementId: "507f1f77bcf86cd799439065" },
  ];
  const plan = planLegacyStatementPaymentRepairs(statements, transactions, [account]);
  assert.equal(plan.repairs.length, 0);
  assert.deepEqual(plan.skipped.map((item) => item.reason).sort(), [
    "LEDGER_IMPACT_DOES_NOT_FULLY_SETTLE_STATEMENT",
    "MULTIPLE_STATEMENT_PAYMENTS",
    "PAYMENT_ACCOUNT_NOT_ACTIVE_REAL_MONEY",
    "STATEMENT_STATUS_UNSUPPORTED",
  ]);
});

test("legacy payment planner fails closed for malformed IDs and detects source drift", () => {
  const malformed = planLegacyStatementPaymentRepairs(
    [{ _id: "bad-statement", paymentStatus: "OPEN", paidAmount: null, paidAt: null }],
    [{ ...payment, _id: "bad-payment", statementId: "bad-statement" }],
    [account],
  );
  assert.equal(malformed.repairs.length, 0);
  assert.equal(malformed.skipped[0]?.reason, "STATEMENT_ID_INVALID");
  const changed = planLegacyStatementPaymentRepairs([
    statement,
  ], [
    { ...payment },
    { _id: "507f1f77bcf86cd799439041", statementId: "507f1f77bcf86cd799439021", transactionType: "EXPENSE", amount: 900, creditDebt: 900, accountId: "507f1f77bcf86cd799439051" },
  ], [account]);
  assert.notEqual(changed.sourceHash, planLegacyStatementPaymentRepairs([
    statement,
  ], [
    { ...payment },
    { _id: "507f1f77bcf86cd799439041", statementId: "507f1f77bcf86cd799439021", transactionType: "EXPENSE", amount: 1000, creditDebt: 1000, accountId: "507f1f77bcf86cd799439051" },
  ], [account]).sourceHash);
});

test("reconciliation cases are additive and idempotent by workspace and transaction", () => {
  const indexes = FinancialReconciliationCaseModel.schema.indexes() as Array<[Record<string, unknown>, { name?: string; unique?: boolean }] >;
  const unique = indexes.find(([, options]) => options.name === "reconciliation_case_unique");
  assert.equal(unique?.[1].unique, true);
  assert.equal(indexes.some(([, options]) => options.name === "reconciliation_case_workspace_status"), true);
});
