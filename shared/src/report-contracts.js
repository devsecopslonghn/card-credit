import { z } from "zod";

const safeInteger = z.number().int().refine(Number.isSafeInteger, "Must be a safe integer");
const safeNonNegativeInteger = safeInteger.nonnegative();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, "Must be a valid calendar date");

/** Ledger metrics are intentionally shared by totals and each grouping. */
export const financialReportMetricSchema = z.object({
  personalSpending: safeInteger,
  debitCashflow: safeInteger,
  creditDebt: safeInteger,
  outstandingReceivable: safeNonNegativeInteger,
  reimbursementReceived: safeNonNegativeInteger,
  transactionCount: safeNonNegativeInteger,
});

/**
 * Benefit KPIs are kept on totals only. Grouped ledger metrics must not gain
 * fee/cashback semantics that they cannot prove from their source collection.
 */
export const financialReportTotalsSchema = financialReportMetricSchema.extend({
  totalServiceFee: safeNonNegativeInteger,
  transactionCashbackActual: safeNonNegativeInteger,
  monthlyBankCashbackExpected: safeNonNegativeInteger,
  monthlyBankCashbackActual: safeNonNegativeInteger,
  monthlyBankCashbackRejected: safeNonNegativeInteger,
  totalPaidCardFees: safeNonNegativeInteger,
  actualNetBenefit: safeInteger,
});

const accountMetricSchema = financialReportMetricSchema.extend({ name: z.string() });

export const financialReportSchema = z.object({
  range: z.object({ from: isoDate, to: isoDate }),
  totals: financialReportTotalsSchema,
  netAssets: safeInteger,
  creditDebtBalance: safeInteger,
  debit: financialReportMetricSchema,
  cash: financialReportMetricSchema,
  eWallet: financialReportMetricSchema,
  realMoney: financialReportMetricSchema,
  credit: financialReportMetricSchema,
  byCategory: z.record(z.string(), financialReportMetricSchema),
  byAccount: z.record(z.string(), accountMetricSchema),
});
