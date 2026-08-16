import { z } from "zod";
import { financialTransactionSchema } from "./transaction-contracts.js";

const safeNonNegativeInteger = z.number().int().nonnegative().refine(Number.isSafeInteger, "Must be a safe integer");
const safePositiveInteger = z.number().int().positive().refine(Number.isSafeInteger, "Must be a safe integer");
export const statementPaymentStatusSchema = z.enum(["OPEN", "STATEMENT_CLOSED", "PAID", "OVERDUE"]);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, "Must be a valid calendar date");

export const statementSummarySchema = z.object({
  statementAmount: safeNonNegativeInteger,
  paymentAmount: safeNonNegativeInteger,
  outstandingAmount: safeNonNegativeInteger,
  personalSpending: safeNonNegativeInteger,
  outstandingReceivable: safeNonNegativeInteger,
  reimbursementReceived: safeNonNegativeInteger,
  transactionCount: safeNonNegativeInteger,
});

export const statementSchema = z.object({
  id: z.string().min(1),
  cardId: z.string().min(1),
  periodStartDate: isoDateSchema,
  periodEndDate: isoDateSchema,
  statementDate: isoDateSchema,
  paymentDueDate: isoDateSchema,
  statementDaySnapshot: z.number().int().min(1).max(31).refine(Number.isSafeInteger, "Must be a safe integer"),
  paymentDueDaysSnapshot: safePositiveInteger,
  paymentStatus: statementPaymentStatusSchema,
  effectivePaymentStatus: statementPaymentStatusSchema,
  paidAt: z.string().nullable(),
  paidAmount: safeNonNegativeInteger.nullable(),
  summary: statementSummarySchema,
  transactions: z.array(financialTransactionSchema).optional(),
});

export const statementListSchema = z.array(statementSchema);
