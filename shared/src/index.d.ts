import type { z } from "zod";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};

export declare const createApiErrorBody: (
  code: string,
  message: string,
  fields?: Record<string, string>,
) => ApiErrorBody;

export declare const isApiErrorBody: (value: unknown) => value is ApiErrorBody;

export declare const accountTypeSchema: z.ZodEnum<{
  DEBIT: "DEBIT";
  CASH: "CASH";
  E_WALLET: "E_WALLET";
  CREDIT: "CREDIT";
}>;
export declare const realMoneyAccountTypeSchema: z.ZodEnum<{
  DEBIT: "DEBIT";
  CASH: "CASH";
  E_WALLET: "E_WALLET";
}>;
export declare const accountGroupSchema: z.ZodEnum<{
  REAL_MONEY: "REAL_MONEY";
  DEBT: "DEBT";
}>;

export type AccountType = z.infer<typeof accountTypeSchema>;
export type AccountGroup = z.infer<typeof accountGroupSchema>;
export type CreateAccountInput = {
  name: string;
  type: AccountType;
  creditCardId?: string;
  openingBalance: number;
};
export type CreateRealMoneyAccountInput = {
  name: string;
  type: Exclude<AccountType, "CREDIT">;
  openingBalance: number;
};
export type AccountDto = {
  id: string;
  name: string;
  type: AccountType;
  group: AccountGroup;
  currency: "VND";
  active: boolean;
  creditCardId: string | null;
  openingBalance: number;
  currentBalance: number;
  currentDebt: number;
};

export declare const createAccountInputSchema: z.ZodObject<any>;
export declare const createRealMoneyAccountInputSchema: z.ZodObject<any>;
export declare const accountSchema: z.ZodObject<any>;
export declare const accountListSchema: z.ZodArray<typeof accountSchema>;
