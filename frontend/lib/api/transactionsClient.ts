export type PaymentStatus = "OPEN" | "STATEMENT_CLOSED" | "PAID" | "OVERDUE";
export type CashbackStatus = "PENDING" | "RECEIVED" | "REJECTED";
export type IncomeInputMode = "AMOUNT" | "RATE";

export type TransactionDerived = {
  serviceFee: number;
  expectedCashbackAmount: number;
  expectedNetProfit: number;
  actualCashbackAmount: number;
  actualNetProfit: number | null;
};

export type CardTransactionView = {
  _id: string;
  userCardId: string;
  statementId: string;
  transactionDate: string;
  outcomeAmount: number;
  incomeAmount: number;
  partnerReturnRateBps: number;
  incomeInputMode: IncomeInputMode;
  cashbackRateBps: number;
  actualCashbackAmount: number | null;
  cashbackStatus: CashbackStatus;
  eligibleForAnnualFeeWaiver: boolean;
  note: string;
  derived: TransactionDerived;
  card?: {
    _id: string;
    providerName: string;
    displayName: string;
    network: string;
    owner: string;
  };
};

export type StatementSummary = {
  totalOutcome: number;
  totalIncome: number;
  totalServiceFee: number;
  cashbackByRate: number;
  expectedCashback: number;
  eligibleCashback: number;
  actualCashback: number;
  exceededCashback: number;
  remainingCashback: number | null;
  expectedNetProfit: number;
  actualNetProfit: number;
  annualEligibleSpend: number;
  transactionCount: number;
  totalAmountDue: number;
  cashbackCap: {
    capAmount: number | null;
    unlimited: boolean;
    cashbackByRate: number;
    eligibleCashback: number;
    actualCashback: number;
    exceededCashback: number;
    remainingCashback: number | null;
    capUsedPercent: number | null;
  };
};

export type CardStatementView = {
  _id: string;
  userCardId: string;
  periodStartDate: string;
  periodEndDate: string;
  statementDate: string;
  paymentDueDate: string;
  statementDaySnapshot: number;
  paymentDueDaysSnapshot: number;
  paymentStatus: PaymentStatus;
  effectivePaymentStatus: PaymentStatus;
  paidAt: string | null;
  paidAmount: number | null;
  summary: StatementSummary;
  cashbackCapAmount?: number | null;
  cashbackCapPeriod?: "STATEMENT" | "CALENDAR_MONTH";
  transactions?: CardTransactionView[];
};

export type TransactionPayload = {
  userCardId: string;
  transactionDate: string;
  outcomeAmount: number;
  incomeAmount?: number;
  partnerReturnRateBps?: number;
  incomeInputMode: IncomeInputMode;
  cashbackRateBps: number;
  eligibleForAnnualFeeWaiver: boolean;
  note: string;
};

type ApiErrorBody = {
  error?: {
    message?: string;
    fields?: Record<string, string>;
  };
  message?: string;
};

type DataResponse<T> = {
  data: T;
  requiresClosedStatementConfirmation?: boolean;
};

const parseApiError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error?.message || body.message || fallback;
  } catch {
    return fallback;
  }
};

export const fetchTransactions = async (params: { date?: string; cardId?: string; statementId?: string } = {}) => {
  const searchParams = new URLSearchParams({ timestamp: String(Date.now()) });
  if (params.date) searchParams.set("date", params.date);
  if (params.cardId) searchParams.set("cardId", params.cardId);
  if (params.statementId) searchParams.set("statementId", params.statementId);
  const response = await fetch(`/api/card-transactions?${searchParams}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể tải giao dịch."));
  const body = (await response.json()) as DataResponse<CardTransactionView[]>;
  return body.data ?? [];
};

export const createTransaction = async (payload: TransactionPayload) => {
  const response = await fetch("/api/card-transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể tạo giao dịch."));
  return (await response.json()) as DataResponse<CardTransactionView>;
};

export const updateTransaction = async (transactionId: string, payload: TransactionPayload) => {
  const response = await fetch(`/api/card-transactions/${transactionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể cập nhật giao dịch."));
  return (await response.json()) as DataResponse<CardTransactionView>;
};

export const deleteTransaction = async (transactionId: string) => {
  const response = await fetch(`/api/card-transactions/${transactionId}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể xóa giao dịch."));
  return (await response.json()) as DataResponse<{ deletedId: string; requiresClosedStatementConfirmation: boolean }>;
};

export const updateTransactionCashback = async (
  transactionId: string,
  payload: { cashbackStatus: CashbackStatus; actualCashbackAmount?: number },
) => {
  const response = await fetch(`/api/card-transactions/${transactionId}/cashback`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể cập nhật cashback."));
  return (await response.json()) as DataResponse<CardTransactionView>;
};

export const fetchCardStatements = async (cardId: string) => {
  const response = await fetch(`/api/cards/${cardId}/statements?timestamp=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể tải kỳ sao kê."));
  const body = (await response.json()) as DataResponse<CardStatementView[]>;
  return body.data ?? [];
};

export const fetchAllCardStatements = async () => {
  const response = await fetch(`/api/card-statements?timestamp=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(await parseApiError(response, "Không thể tải kỳ sao kê."));
  const body = (await response.json()) as DataResponse<CardStatementView[]>;
  return body.data ?? [];
};

export const fetchStatementDetail = async (cardId: string, statementId: string) => {
  const response = await fetch(`/api/cards/${cardId}/statements/${statementId}?timestamp=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể tải chi tiết kỳ sao kê."));
  const body = (await response.json()) as DataResponse<CardStatementView>;
  return body.data;
};

export const updateStatementPayment = async (cardId: string, statementId: string, action: "PAID" | "REOPEN" | "CLOSED") => {
  const response = await fetch(`/api/cards/${cardId}/statements/${statementId}/payment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể cập nhật trạng thái thanh toán."));
  const body = (await response.json()) as DataResponse<CardStatementView>;
  return body.data;
};

export type StatementCalendarEmailResponse = { data: { sent: true; recipient: string } };

export const sendStatementCalendarEmail = async (cardId: string, statementId: string) => {
  const { sendStatementCalendarEmailRequest } = await import("./statementCalendarEmailCore.mjs");
  return sendStatementCalendarEmailRequest(fetch, cardId, statementId) as Promise<StatementCalendarEmailResponse>;
};
