import assert from "node:assert/strict";
import test from "node:test";
import { financialReportSchema } from "../src/index.js";

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
