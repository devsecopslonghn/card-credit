import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { summarizeCardDebt } from "../lib/cards/cardDebtCore.mjs";
import { summarizeTransactions } from "../lib/cards/statementCore.mjs";

const statement = (overrides) => ({
  _id: overrides._id,
  statementDate: overrides.statementDate,
  paymentDueDate: overrides.paymentDueDate,
  paymentStatus: overrides.paymentStatus ?? "STATEMENT_CLOSED",
  effectivePaymentStatus: overrides.effectivePaymentStatus ?? overrides.paymentStatus ?? "STATEMENT_CLOSED",
  summary: { totalAmountDue: overrides.amount },
});

test("card debt summary uses statement summaries for outstanding current and next month debt", () => {
  const summary = summarizeCardDebt(
    [
      statement({ _id: "jul", statementDate: "2026-07-07", paymentDueDate: "2026-07-22", amount: 1_000_000 }),
      statement({ _id: "aug", statementDate: "2026-07-07", paymentDueDate: "2026-08-14", amount: 2_000_000 }),
      statement({ _id: "sep", statementDate: "2026-09-07", paymentDueDate: "2026-09-22", amount: 3_000_000 }),
    ],
    "2026-07-10",
  );

  assert.equal(summary.totalOutstanding, 3_000_000);
  assert.equal(summary.outstandingCount, 2);
  assert.equal(summary.currentMonthDue, 1_000_000);
  assert.equal(summary.currentMonthDueCount, 1);
  assert.equal(summary.nextMonthDue, 2_000_000);
  assert.equal(summary.nextMonthDueCount, 1);
});

test("card debt summary ignores paid zero amount and future statements", () => {
  const summary = summarizeCardDebt(
    [
      statement({ _id: "paid", statementDate: "2026-07-07", paymentDueDate: "2026-07-22", amount: 1_000_000, paymentStatus: "PAID" }),
      statement({ _id: "zero", statementDate: "2026-07-07", paymentDueDate: "2026-07-22", amount: 0 }),
      statement({ _id: "future", statementDate: "2026-08-07", paymentDueDate: "2026-08-22", amount: 2_000_000 }),
      statement({ _id: "valid", statementDate: "2026-07-07", paymentDueDate: "2026-07-22", amount: 3_000_000 }),
    ],
    "2026-07-10",
  );

  assert.equal(summary.totalOutstanding, 3_000_000);
  assert.equal(summary.outstandingCount, 1);
  assert.equal(summary.currentMonthDue, 3_000_000);
  assert.equal(summary.nextMonthDue, 0);
});

test("statement cashback cap resets when summaries are calculated per statement period", () => {
  const july = summarizeTransactions(
    [{ outcomeAmount: 6_000_000, incomeAmount: 5_800_000, cashbackRateBps: 1000 }],
    { cashbackCapAmount: 500_000, cashbackCapPeriod: "STATEMENT", statement: { statementDate: "2026-07-07" } },
  );
  const august = summarizeTransactions(
    [{ outcomeAmount: 4_000_000, incomeAmount: 3_900_000, cashbackRateBps: 1000 }],
    { cashbackCapAmount: 500_000, cashbackCapPeriod: "STATEMENT", statement: { statementDate: "2026-08-07" } },
  );

  assert.equal(july.cashbackByRate, 600_000);
  assert.equal(july.eligibleCashback, 500_000);
  assert.equal(july.remainingCashback, 0);
  assert.equal(august.cashbackByRate, 400_000);
  assert.equal(august.eligibleCashback, 400_000);
  assert.equal(august.remainingCashback, 100_000);
});

test("card detail displays debt from statements without legacy card amount fields", () => {
  const source = readFileSync(new URL("../app/cards/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(source, /summarizeCardDebt/);
  assert.match(source, /Đang nợ ngân hàng/);
  assert.match(source, /Cần thanh toán tháng này/);
  assert.match(source, /Cần thanh toán tháng kế tiếp/);
  assert.match(source, /Cashback được hưởng\/đã dùng kỳ này/);
  assert.equal(source.includes("amountDueThisMonth"), false);
  assert.equal(source.includes("monthlyData"), false);
});
