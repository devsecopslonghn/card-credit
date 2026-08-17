import { accountListSchema, budgetStatusListSchema, creditStatementReportListSchema, financialReportSchema, financialTransactionListQuerySchema, financialTransactionListSchema, reportDateRangeSchema } from "@card-credit/contracts";
import type { AccountDto, BudgetStatusDto, CreditStatementReportDto, FinancialReportDto, FinancialTransactionDto, FinancialTransactionListQuery } from "@card-credit/contracts";

export type FinancialTransaction = FinancialTransactionDto;

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(`Finance request failed: ${response.status}`);
  const body = (await response.json()) as { data: T };
  return body.data;
};

export const listFinancialTransactions = async (input: FinancialTransactionListQuery = {}) => {
  const query = financialTransactionListQuerySchema.parse(input);
  const params = new URLSearchParams();
  for (const key of ["from", "to", "accountId", "categoryId", "limit"] as const) {
    const value = query[key] as string | undefined;
    if (value !== undefined) params.set(key, String(value));
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return financialTransactionListSchema.parse(await request<unknown>(`/api/financial-transactions${suffix}`)) as FinancialTransaction[];
};
export const getFinancialSummary = async (from: string, to: string, cardId?: string): Promise<FinancialReportDto> => {
  const range = reportDateRangeSchema.parse({ from, to }) as { from: string; to: string };
  const cardSuffix = cardId ? `&cardId=${encodeURIComponent(cardId)}` : "";
  return financialReportSchema.parse(await request<unknown>(`/api/financial-reports/summary?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}${cardSuffix}`)) as FinancialReportDto;
};
export const getCreditStatements = async (from?: string, to?: string): Promise<CreditStatementReportDto[]> => creditStatementReportListSchema.parse(await request<unknown>(`/api/financial-reports/credit-statements${from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : ""}`)) as CreditStatementReportDto[];
export const getBudgetStatus = async (month: string): Promise<BudgetStatusDto[]> => budgetStatusListSchema.parse(await request<unknown>(`/api/finance/budgets/status?month=${encodeURIComponent(month)}`)) as BudgetStatusDto[];
export const upsertBudget = async (input: { month: string; categoryId: string; limitAmount: number; warningPercent?: number }) => {
  if (!/^\d{4}-\d{2}$/.test(input.month) || !input.categoryId.trim() || !Number.isSafeInteger(input.limitAmount) || input.limitAmount <= 0) {
    throw new Error("Budget không hợp lệ.");
  }
  await request<unknown>("/api/finance/budgets", { method: "PUT", body: JSON.stringify({ ...input, categoryId: input.categoryId.trim() }) });
};

export type FinanceAccount = AccountDto;

export const listFinanceAccounts = async () => accountListSchema.parse(await request<unknown>("/api/accounts")) as FinanceAccount[];
