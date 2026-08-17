import { z } from "zod";
import { statementPaymentStatusSchema } from "./statement-contracts.js";
import { isoDateSchema } from "./date-contracts.js";

const safeInteger = z.number().int().refine(Number.isSafeInteger, "Must be a safe integer");
const safeNonNegativeInteger = safeInteger.nonnegative();
export const reportDateSchema = isoDateSchema;

export const reportDateRangeSchema = z.strictObject({
  from: reportDateSchema,
  to: reportDateSchema,
}).superRefine((range, context) => {
  if (range.from > range.to) context.addIssue({ code: "custom", path: ["to"], message: "The report range must be ordered from earliest to latest date" });
});

export const reportQuerySchema = z.strictObject({
  from: reportDateSchema.optional(),
  to: reportDateSchema.optional(),
  cardId: z.string().min(1).optional(),
});

/** Resolve the REST-compatible current-month-to-today default without transport concerns. */
export const resolveReportDateRange = (input = {}, today = new Date()) => {
  const todayValue = today instanceof Date && !Number.isNaN(today.valueOf())
    ? today.toISOString().slice(0, 10)
    : reportDateSchema.parse(today);
  return reportDateRangeSchema.parse({
    from: input.from ?? `${todayValue.slice(0, 7)}-01`,
    to: input.to ?? todayValue,
  });
};

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
  range: reportDateRangeSchema,
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

export const creditStatementReportSchema = z.strictObject({
  statementId: z.string().min(1),
  statementDate: reportDateSchema,
  periodStartDate: reportDateSchema,
  periodEndDate: reportDateSchema,
  paymentDueDate: reportDateSchema,
  paymentStatus: statementPaymentStatusSchema,
  outstandingDebt: safeNonNegativeInteger,
  grossCharges: safeNonNegativeInteger,
  payments: safeNonNegativeInteger,
  personalSpending: safeNonNegativeInteger,
  outstandingReceivable: safeNonNegativeInteger,
  transactionCount: safeNonNegativeInteger,
});

export const creditStatementReportListSchema = z.array(creditStatementReportSchema);
