import assert from "node:assert/strict";
import test from "node:test";
import { createFinancialTransactionBatchInputSchema, createFinancialTransactionInputSchema, financialTransactionListSchema } from "../src/index.js";

const input = { accountId: "507f1f77bcf86cd799439011", transactionDate: "2026-08-16", amount: 1000, transactionType: "EXPENSE", ownership: "PERSONAL", note: "Lunch" };
const output = { id: "507f1f77bcf86cd799439012", accountId: input.accountId, statementId: null, reimbursementForTransactionId: null, accountType: "DEBIT", transactionType: "EXPENSE", ownership: "PERSONAL", amount: 1000, serviceFeeRate: null, categoryId: "OTHER", transactionDate: input.transactionDate, note: "Lunch", impact: { personalSpending: 1000, debitCashflow: -1000, creditDebt: 0, outstandingReceivable: 0, reimbursementReceived: 0 } };

test("transaction input and output share one canonical DTO contract", () => {
  assert.deepEqual(createFinancialTransactionInputSchema.parse(input), input);
  assert.deepEqual(financialTransactionListSchema.parse([output]), [output]);
  assert.throws(() => createFinancialTransactionInputSchema.parse({ ...input, amount: 0 }));
  assert.throws(() => createFinancialTransactionInputSchema.parse({ ...input, amount: Number.MAX_SAFE_INTEGER + 1 }));
  assert.throws(() => createFinancialTransactionInputSchema.parse({ ...input, amount: 1.25 }));
});

test("transaction batch is bounded", () => {
  assert.throws(() => createFinancialTransactionBatchInputSchema.parse({ items: [] }));
  assert.throws(() => createFinancialTransactionBatchInputSchema.parse({ items: Array.from({ length: 51 }, () => input) }));
});
