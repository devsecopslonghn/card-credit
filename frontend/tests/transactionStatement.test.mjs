import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildStatementPeriod,
  calculateEligibleCashback,
  calculateTransactionDerived,
  deriveIncomeFromRate,
  deriveRateFromIncome,
  resolveStatementDate,
  summarizeTransactions,
} from "../lib/cards/statementCore.mjs";

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
  assert.equal(summary.cashbackByRate, 200_000);
  assert.equal(summary.eligibleCashback, 200_000);
  assert.equal(summary.expectedNetProfit, 50_000);
  assert.equal(summary.annualEligibleSpend, 1_000_000);
});

test("statement cashback cap limits eligible and actual cashback", () => {
  const summary = summarizeTransactions(
    [
      { outcomeAmount: 3_000_000, incomeAmount: 2_900_000, cashbackRateBps: 1000 },
      { outcomeAmount: 3_000_000, incomeAmount: 2_900_000, cashbackRateBps: 1000, cashbackStatus: "RECEIVED", actualCashbackAmount: 480_000 },
    ],
    { cashbackCapAmount: 500_000, cashbackCapPeriod: "STATEMENT" },
  );

  assert.equal(summary.cashbackByRate, 600_000);
  assert.equal(summary.eligibleCashback, 500_000);
  assert.equal(summary.expectedCashback, 500_000);
  assert.equal(summary.actualCashback, 480_000);
  assert.equal(summary.exceededCashback, 100_000);
  assert.equal(summary.remainingCashback, 0);
  assert.equal(summary.cashbackCap.capUsedPercent, 100);
  assert.equal(summary.expectedNetProfit, 300_000);
});

test("statement actual net profit uses capped actual cashback", () => {
  const summary = summarizeTransactions(
    [
      {
        outcomeAmount: 17_390_000,
        incomeAmount: 17_300_000,
        cashbackRateBps: 500,
        cashbackStatus: "RECEIVED",
        actualCashbackAmount: 869_500,
      },
    ],
    { cashbackCapAmount: 600_000, cashbackCapPeriod: "STATEMENT" },
  );

  assert.equal(summary.totalServiceFee, 90_000);
  assert.equal(summary.cashbackByRate, 869_500);
  assert.equal(summary.eligibleCashback, 600_000);
  assert.equal(summary.actualCashback, 600_000);
  assert.equal(summary.expectedNetProfit, 510_000);
  assert.equal(summary.actualNetProfit, 510_000);
});

test("cashback cap strategy reports remaining cashback for statement period", () => {
  const cap = calculateEligibleCashback([], 500_000, "STATEMENT", {
    cashbackByRate: 420_000,
    actualCashback: 0,
  });

  assert.equal(cap.eligibleCashback, 420_000);
  assert.equal(cap.remainingCashback, 80_000);
  assert.equal(cap.exceededCashback, 0);
  assert.equal(cap.capUsedPercent, 84);
});
