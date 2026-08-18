import { accountListSchema, budgetStatusListSchema, createFinancialTransactionInputSchema, financeCategoryListSchema, financialReportSchema, financialTransactionListQuerySchema, financialTransactionListSchema, financialTransactionSchema, reportQuerySchema, reportDateRangeSchema, updateFinancialTransactionInputSchema } from "@card-credit/contracts";
import type { AccountDto, BudgetStatusDto, CreateFinancialTransactionInput, FinanceCategoryDto, FinancialReportDto, FinancialTransactionDto, FinancialTransactionListQuery, UpdateFinancialTransactionInput } from "@card-credit/contracts";

export type FinancialTransaction = FinancialTransactionDto;
const mutationKey = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

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
export const createFinancialTransaction = async (input: CreateFinancialTransactionInput): Promise<FinancialTransactionDto> => {
  const payload = createFinancialTransactionInputSchema.parse(input);
  return financialTransactionSchema.parse(await request<unknown>("/api/financial-transactions", { method: "POST", headers: { "Idempotency-Key": mutationKey("transaction-create") }, body: JSON.stringify(payload) })) as FinancialTransactionDto;
};
export const updateFinancialTransaction = async (id: string, input: UpdateFinancialTransactionInput): Promise<FinancialTransactionDto> => {
  const payload = updateFinancialTransactionInputSchema.parse(input);
  return financialTransactionSchema.parse(await request<unknown>(`/api/financial-transactions/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Idempotency-Key": mutationKey("transaction-update") }, body: JSON.stringify(payload) })) as FinancialTransactionDto;
};
export const deleteFinancialTransaction = async (id: string) => {
  await request<unknown>(`/api/financial-transactions/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "Idempotency-Key": mutationKey("transaction-delete") } });
};
export type FinancialSummaryQuery = { from?: string; to?: string; cardId?: string; owner?: string; year?: string; month?: string };
export const getFinancialSummary = async (fromOrQuery: string | FinancialSummaryQuery, to?: string, cardId?: string): Promise<FinancialReportDto> => {
  const input = typeof fromOrQuery === "string"
    ? { ...reportDateRangeSchema.parse({ from: fromOrQuery, to }), ...(cardId ? { cardId } : {}) }
    : fromOrQuery;
  const query = reportQuerySchema.parse(input);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value));
  return financialReportSchema.parse(await request<unknown>(`/api/financial-reports/summary?${params.toString()}`)) as FinancialReportDto;
};
export const getBudgetStatus = async (month: string): Promise<BudgetStatusDto[]> => budgetStatusListSchema.parse(await request<unknown>(`/api/finance/budgets/status?month=${encodeURIComponent(month)}`)) as BudgetStatusDto[];
export const listFinanceCategories = async (): Promise<FinanceCategoryDto[]> => financeCategoryListSchema.parse(await request<unknown>("/api/finance/categories")) as FinanceCategoryDto[];
export const upsertBudget = async (input: { month: string; categoryId: string; limitAmount: number; warningPercent?: number }) => {
  if (!/^\d{4}-\d{2}$/.test(input.month) || !input.categoryId.trim() || !Number.isSafeInteger(input.limitAmount) || input.limitAmount <= 0) {
    throw new Error("Budget không hợp lệ.");
  }
  await request<unknown>("/api/finance/budgets", { method: "PUT", body: JSON.stringify({ ...input, categoryId: input.categoryId.trim() }) });
};

export type FinanceAccount = AccountDto;

export const listFinanceAccounts = async () => accountListSchema.parse(await request<unknown>("/api/accounts")) as FinanceAccount[];
