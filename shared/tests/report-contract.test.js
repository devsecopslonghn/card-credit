import assert from "node:assert/strict";
import test from "node:test";
import { financialReportSchema, reportDateRangeSchema, reportDateSchema, resolveReportDateRange } from "../src/index.js";

const metric = { personalSpending: 0, debitCashflow: 0, creditDebt: 0, outstandingReceivable: 0, reimbursementReceived: 0, transactionCount: 0 };

test("financial report contract keeps benefit KPIs on totals", () => {
  const report = {
    range: { from: "2026-08-01", to: "2026-08-31" },
    totals: { ...metric, totalServiceFee: 100, transactionCashbackActual: 50, monthlyBankCashbackExpected: 500, monthlyBankCashbackActual: 450, monthlyBankCashbackRejected: 25, totalPaidCardFees: 75, actualNetBenefit: 275 },
    netAssets: 0,
    creditDebtBalance: 0,
    debit: metric,
    cash: metric,
    eWallet: metric,
    realMoney: metric,
    credit: metric,
    byCategory: {},
    byAccount: {},
  };
  assert.deepEqual(financialReportSchema.parse(report), report);
  assert.throws(() => financialReportSchema.parse({ ...report, totals: { ...report.totals, totalPaidCardFees: -1 } }));
});

test("report date range is strict, calendar-valid and ordered", () => {
  assert.equal(reportDateSchema.parse("2026-02-28"), "2026-02-28");
  assert.deepEqual(reportDateRangeSchema.parse({ from: "2026-08-01", to: "2026-08-31" }), { from: "2026-08-01", to: "2026-08-31" });
  assert.throws(() => reportDateSchema.parse("2026-02-30"));
  assert.throws(() => reportDateRangeSchema.parse({ from: "2026-09-01", to: "2026-08-31" }));
  assert.throws(() => reportDateRangeSchema.parse({ from: "2026-08-01", to: "2026-08-31", ownerId: "owner-1" }));
});

test("report date range keeps REST defaults in the shared contract", () => {
  const today = new Date("2026-08-16T12:00:00.000Z");
  assert.deepEqual(resolveReportDateRange({}, today), { from: "2026-08-01", to: "2026-08-16" });
  assert.deepEqual(resolveReportDateRange({ from: "2026-07-10" }, today), { from: "2026-07-10", to: "2026-08-16" });
  assert.deepEqual(resolveReportDateRange({ to: "2026-08-10" }, today), { from: "2026-08-01", to: "2026-08-10" });
});
