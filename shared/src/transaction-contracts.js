import { z } from "zod";
import { isoDateSchema } from "./date-contracts.js";

export const financialTransactionTypeSchema = z.enum(["EXPENSE", "TRANSFER", "REIMBURSEMENT", "REFUND", "CASHBACK", "INCOME", "STATEMENT_PAYMENT"]);
export const ownershipSchema = z.enum(["PERSONAL", "PAID_FOR_OTHER"]);
export const FINANCIAL_TRANSACTION_DEFAULT_LIMIT = 100;
export const FINANCIAL_TRANSACTION_MAX_LIMIT = 100;
const safePositiveInteger = z.number().int().positive().refine(Number.isSafeInteger, "Must be a safe integer");
const safeNonNegativeInteger = z.number().int().nonnegative().refine(Number.isSafeInteger, "Must be a safe integer");
export const createFinancialTransactionInputSchema = z.object({
  accountId: z.string().trim().min(1),
  transactionDate: isoDateSchema,
  amount: safePositiveInteger,
  categoryId: z.string().trim().min(1).optional(),
  transactionType: financialTransactionTypeSchema.optional(),
  ownership: ownershipSchema.optional(),
  reimbursementExpected: safeNonNegativeInteger.optional(),
  serviceFeeRate: z.number().min(0).max(100).optional(),
  refundReceived: safeNonNegativeInteger.optional(),
  cashbackReceived: safeNonNegativeInteger.optional(),
  note: z.string().max(1000).optional(),
  statementId: z.string().trim().min(1).optional(),
  reimbursementForTransactionId: z.string().trim().min(1).optional(),
});
export const updateFinancialTransactionInputSchema = createFinancialTransactionInputSchema.omit({ statementId: true, reimbursementForTransactionId: true }).partial().strict().refine(
  (input) => Object.keys(input).length > 0,
  "At least one transaction field is required",
);
export const createFinancialTransactionBatchInputSchema = z.object({ items: z.array(createFinancialTransactionInputSchema).min(1).max(50) });
export const financialTransactionListQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  accountId: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(FINANCIAL_TRANSACTION_MAX_LIMIT).default(FINANCIAL_TRANSACTION_DEFAULT_LIMIT),
}).strict().superRefine((query, context) => {
  if (query.from && query.to && query.from > query.to) {
    context.addIssue({ code: "custom", path: ["to"], message: "The transaction range must be ordered from earliest to latest date" });
  }
});
export const financialImpactSchema = z.object({
  personalSpending: z.number(),
  debitCashflow: z.number(),
  creditDebt: z.number(),
  outstandingReceivable: z.number(),
  reimbursementReceived: z.number(),
});
export const financialTransactionSchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  statementId: z.string().nullable(),
  reimbursementForTransactionId: z.string().nullable(),
  accountType: z.enum(["DEBIT", "CASH", "E_WALLET", "CREDIT"]),
  transactionType: financialTransactionTypeSchema,
  ownership: ownershipSchema,
  amount: z.number().int(),
  serviceFeeRate: z.number().nullable(),
  categoryId: z.string(),
  transactionDate: isoDateSchema,
  note: z.string(),
  impact: financialImpactSchema,
});
export const financialTransactionListSchema = z.array(financialTransactionSchema);
