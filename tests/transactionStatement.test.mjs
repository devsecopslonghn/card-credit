import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildStatementPeriod,
  calculateTransactionDerived,
  deriveIncomeFromRate,
  deriveRateFromIncome,
  resolveStatementDate,
  summarizeTransactions,
} from "../lib/cards/statementCore.mjs";
import { createTransaction } from "../lib/services/transactionService.mjs";

test("statement boundary uses previous exclusive and current inclusive", () => {
  assert.equal(resolveStatementDate("2026-07-07", 7), "2026-07-07");
  assert.equal(resolveStatementDate("2026-07-08", 7), "2026-08-07");

  const period = buildStatementPeriod({ transactionDate: "2026-07-08", statementDay: 7, paymentDueDays: 15 });
  assert.equal(period.periodStartDate, "2026-07-08");
  assert.equal(period.periodEndDate, "2026-08-07");
  assert.equal(period.paymentDueDate, "2026-08-22");
});

test("statement day clamps to last day of short months and leap years", () => {
  assert.equal(resolveStatementDate("2026-02-28", 31), "2026-02-28");
  assert.equal(resolveStatementDate("2026-03-01", 31), "2026-03-31");
  assert.equal(resolveStatementDate("2028-02-29", 31), "2028-02-29");
});

test("transaction derived values use integer VND and basis points", () => {
  assert.equal(deriveIncomeFromRate(1_000_000, 9500), 950_000);
  assert.equal(deriveRateFromIncome(1_000_000, 950_000), 9500);

  const derived = calculateTransactionDerived({
    outcomeAmount: 1_000_000,
    incomeAmount: 950_000,
    cashbackRateBps: 1000,
    cashbackStatus: "RECEIVED",
    actualCashbackAmount: 90_000,
  });

  assert.equal(derived.serviceFee, 50_000);
  assert.equal(derived.expectedCashbackAmount, 100_000);
  assert.equal(derived.expectedNetProfit, 50_000);
  assert.equal(derived.actualNetProfit, 40_000);
});

test("statement summary keeps bank amount due separate from profit", () => {
  const summary = summarizeTransactions([
    { outcomeAmount: 1_000_000, incomeAmount: 950_000, cashbackRateBps: 1000, eligibleForAnnualFeeWaiver: true },
    { outcomeAmount: 2_000_000, incomeAmount: 1_900_000, cashbackRateBps: 500, eligibleForAnnualFeeWaiver: false },
  ]);

  assert.equal(summary.totalAmountDue, 3_000_000);
  assert.equal(summary.totalIncome, 2_850_000);
  assert.equal(summary.totalServiceFee, 150_000);
  assert.equal(summary.expectedCashback, 200_000);
  assert.equal(summary.expectedNetProfit, 50_000);
  assert.equal(summary.annualEligibleSpend, 1_000_000);
});

test("paid statements block transaction creation in service layer", async () => {
  const card = {
    _id: "507f1f77bcf86cd799439011",
    workspaceId: "workspace-a",
    statementDay: 7,
    paymentDueDays: 15,
  };
  const paidStatement = {
    _id: "507f1f77bcf86cd799439012",
    workspaceId: "workspace-a",
    userCardId: card._id,
    statementDate: "2026-08-07",
    paymentStatus: "PAID",
  };
  const CardModel = { async findById() { return card; } };
  const CardStatementModel = {
    async findOneAndUpdate() {
      return paidStatement;
    },
  };
  const TransactionModel = {
    async create() {
      throw new Error("create should not be called");
    },
  };

  await assert.rejects(
    () =>
      createTransaction(
        {
          userCardId: card._id,
          transactionDate: "2026-07-08",
          outcomeAmount: 1_000_000,
          incomeAmount: 950_000,
          incomeInputMode: "AMOUNT",
          cashbackRateBps: 1000,
          eligibleForAnnualFeeWaiver: true,
          note: "blocked",
        },
        { TransactionModel, CardModel, CardStatementModel },
        { userId: "user-a", workspaceId: "workspace-a" },
      ),
    /Kỳ sao kê đã thanh toán/,
  );
});
