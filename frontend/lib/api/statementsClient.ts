export type PaymentStatus = "OPEN" | "STATEMENT_CLOSED" | "PAID" | "OVERDUE";
export type StatementSummary = {
  totalOutcome: number; totalIncome: number; totalServiceFee: number; cashbackByRate: number;
  expectedCashback: number; eligibleCashback: number; actualCashback: number; exceededCashback: number;
  remainingCashback: number | null; expectedNetProfit: number; actualNetProfit: number;
  annualEligibleSpend: number; transactionCount: number; totalAmountDue: number;
  cashbackCap: { capAmount: number | null; unlimited: boolean; cashbackByRate: number; eligibleCashback: number; actualCashback: number; exceededCashback: number; remainingCashback: number | null; capUsedPercent: number | null };
};
export type StatementTransactionView = { id?: string; _id?: string; amount?: number; note?: string; transactionDate?: string; [key: string]: unknown };
export type CardStatementView = {
  _id: string; userCardId: string; periodStartDate: string; periodEndDate: string; statementDate: string;
  paymentDueDate: string; statementDaySnapshot: number; paymentDueDaysSnapshot: number; paymentStatus: PaymentStatus;
  effectivePaymentStatus: PaymentStatus; paidAt: string | null; paidAmount: number | null; summary: StatementSummary;
  cashbackCapAmount?: number | null; cashbackCapPeriod?: "STATEMENT" | "CALENDAR_MONTH"; transactions?: StatementTransactionView[];
};
type DataResponse<T> = { data: T };
const parseError = async (response: Response, fallback: string) => { try { const body = await response.json() as { error?: { message?: string }; message?: string }; return body.error?.message || body.message || fallback; } catch { return fallback; } };
const request = async <T>(url: string, init?: RequestInit) => { const response = await fetch(url, init); if (!response.ok) throw new Error(await parseError(response, "Không thể tải dữ liệu sao kê.")); return (await response.json() as DataResponse<T>).data; };
export const fetchCardStatements = (cardId: string) => request<CardStatementView[]>(`/api/cards/${cardId}/statements?timestamp=${Date.now()}`, { cache: "no-store" });
export const fetchAllCardStatements = () => request<CardStatementView[]>(`/api/card-statements?timestamp=${Date.now()}`, { cache: "no-store" });
export const fetchStatementDetail = (cardId: string, statementId: string) => request<CardStatementView>(`/api/cards/${cardId}/statements/${statementId}?timestamp=${Date.now()}`, { cache: "no-store" });
export const updateStatementPayment = (cardId: string, statementId: string, action: "PAID" | "REOPEN" | "CLOSED") => request<CardStatementView>(`/api/cards/${cardId}/statements/${statementId}/payment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
