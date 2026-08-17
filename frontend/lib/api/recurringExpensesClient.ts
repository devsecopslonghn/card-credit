import { recurringExpenseListSchema, recurringExpenseSchema } from "@card-credit/contracts";
import type { RecurringExpenseDto, RecurringExpenseInput } from "@card-credit/contracts";

const request = async (path: string, init?: RequestInit) => {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = (await response.json()) as { data?: unknown; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? `Recurring request failed: ${response.status}`);
  return body.data;
};

export const listRecurringExpenses = async (limit = 100) => recurringExpenseListSchema.parse(await request(`/api/finance/recurring-expenses?limit=${encodeURIComponent(limit)}`)) as RecurringExpenseDto[];
export const saveRecurringExpense = async (input: RecurringExpenseInput, id?: string) => recurringExpenseSchema.parse(await request(id ? `/api/finance/recurring-expenses/${encodeURIComponent(id)}` : "/api/finance/recurring-expenses", { method: id ? "PUT" : "POST", body: JSON.stringify(input) })) as RecurringExpenseDto;
export const deactivateRecurringExpense = async (id: string) => recurringExpenseSchema.parse(await request(`/api/finance/recurring-expenses/${encodeURIComponent(id)}`, { method: "DELETE" })) as RecurringExpenseDto;
