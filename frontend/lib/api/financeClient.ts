export type FinancialImpact = {
  personalSpending: number;
  debitCashflow: number;
  creditDebt: number;
  outstandingReceivable: number;
  reimbursementReceived?: number;
};

export type FinancialTransaction = {
  id: string;
  accountId: string;
  statementId: string | null;
  accountType: "DEBIT" | "CASH" | "E_WALLET" | "CREDIT";
  transactionType: string;
  ownership: "PERSONAL" | "PAID_FOR_OTHER";
  amount: number;
  categoryId: string;
  transactionDate: string;
  note: string;
  impact: FinancialImpact;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(`Finance request failed: ${response.status}`);
  const body = (await response.json()) as { data: T };
  return body.data;
};

export const listFinancialTransactions = (query = "") => request<FinancialTransaction[]>(`/api/financial-transactions${query}`);
export const getFinancialSummary = (from: string, to: string) => request(`/api/financial-reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
export const getCreditStatements = (from?: string, to?: string) => request(`/api/financial-reports/credit-statements${from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : ""}`);
export const getBudgetStatus = (month: string) => request(`/api/finance/budgets/status?month=${encodeURIComponent(month)}`);

export type FinanceAccount = {
  id: string;
  name: string;
  type: "DEBIT" | "CASH" | "E_WALLET" | "CREDIT";
  group: "REAL_MONEY" | "DEBT";
  currency: "VND";
  active: boolean;
  creditCardId: string | null;
  openingBalance: number;
  currentBalance: number;
  currentDebt: number;
};

export const listFinanceAccounts = () => request<FinanceAccount[]>("/api/accounts");
