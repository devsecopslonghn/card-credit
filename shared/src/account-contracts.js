import { z } from "zod";

export const accountTypeSchema = z.enum(["DEBIT", "CASH", "E_WALLET", "CREDIT"]);
export const realMoneyAccountTypeSchema = z.enum(["DEBIT", "CASH", "E_WALLET"]);
export const accountGroupSchema = z.enum(["REAL_MONEY", "DEBT"]);

const accountName = z.string().trim().min(1).max(120);
const openingBalance = z.number().int().nonnegative();

export const createAccountInputSchema = z.object({
  name: accountName,
  type: accountTypeSchema,
  creditCardId: z.string().trim().min(1).optional(),
  openingBalance: openingBalance.default(0),
}).superRefine((value, context) => {
  if (value.type !== "CREDIT" && value.creditCardId) {
    context.addIssue({ code: "custom", path: ["creditCardId"], message: "Chỉ tài khoản CREDIT mới được liên kết thẻ." });
  }
});

export const createRealMoneyAccountInputSchema = z.object({
  name: accountName,
  type: realMoneyAccountTypeSchema,
  openingBalance: openingBalance.default(0),
});

export const accountSchema = z.object({
  id: z.string().min(1),
  name: accountName,
  type: accountTypeSchema,
  group: accountGroupSchema,
  currency: z.literal("VND"),
  active: z.boolean(),
  creditCardId: z.string().min(1).nullable(),
  openingBalance,
  currentBalance: z.number().int(),
  currentDebt: z.number().int().nonnegative(),
});

export const accountListSchema = z.array(accountSchema);

