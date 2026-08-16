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

export declare const catalogNetworkSchema: z.ZodEnum<{
  Visa: "Visa";
  Mastercard: "Mastercard";
  JCB: "JCB";
  "American Express": "American Express";
  UnionPay: "UnionPay";
  Napas: "Napas";
}>;
export declare const catalogThemeSchema: z.ZodObject<any>;
export declare const catalogProductSchema: z.ZodObject<any>;
export declare const catalogProviderSchema: z.ZodObject<any>;
export declare const catalogProductListSchema: z.ZodArray<typeof catalogProductSchema>;
export declare const catalogProviderListSchema: z.ZodArray<typeof catalogProviderSchema>;
export type CatalogProductDto = {
  presetId: string;
  providerCode: string;
  providerName: string;
  displayName: string;
  network: "Visa" | "Mastercard" | "JCB" | "American Express" | "UnionPay" | "Napas";
  segment: string;
  annualFee: number | null;
  targetSpendForWaiver: number | null;
  imageUrl: string | null;
  benefits: string[];
  sourceUrl: string;
  sourceCheckedAt: string;
  active: boolean;
  sortOrder: number;
  theme: { background: string; accent: string };
};
export type CatalogProviderDto = {
  providerCode: string;
  providerName: string;
  products: CatalogProductDto[];
};
