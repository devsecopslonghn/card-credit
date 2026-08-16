import { z } from "zod";

const safeInteger = z.number().int().refine(Number.isSafeInteger, "Must be a safe integer");
const safePositiveInteger = safeInteger.positive();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, "Must be a valid calendar date");

export const feeCategorySchema = z.enum([
  "ANNUAL_CARD_FEE",
  "MANAGEMENT_FEE",
  "OTHER_FEE",
  "BANK_CASHBACK",
  "PARTNER_REFUND",
]);

export const feePaymentSchema = z.object({
  id: z.string().min(1),
  cardId: z.string().min(1),
  category: feeCategorySchema,
  paymentDate: isoDate,
  amount: safePositiveInteger,
  note: z.string(),
});

export const feeCardSummarySchema = z.object({
  id: z.string().min(1),
  providerName: z.string().nullable(),
  displayName: z.string().nullable(),
  owner: z.string(),
});

export const feeCenterRecordSchema = feePaymentSchema.extend({
  card: feeCardSummarySchema.nullable(),
});

export const feePaymentListSchema = z.array(feePaymentSchema);
export const feeCenterRecordListSchema = z.array(feeCenterRecordSchema);
