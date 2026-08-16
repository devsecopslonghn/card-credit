import { statementListSchema, statementPaymentInputSchema, statementSchema } from "@card-credit/contracts";
import type { StatementDto, StatementPaymentAction } from "@card-credit/contracts";

export type PaymentStatus = "OPEN" | "STATEMENT_CLOSED" | "PAID" | "OVERDUE";
export type StatementSummary = {
  totalOutcome: number; totalIncome: number; totalServiceFee: number; cashbackByRate: number;
  expectedCashback: number; eligibleCashback: number; actualCashback: number; exceededCashback: number;
  remainingCashback: number | null; expectedNetProfit: number; actualNetProfit: number;
  annualEligibleSpend: number; transactionCount: number; totalAmountDue: number; outstandingAmount: number;
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
const toLegacyTransaction = (transaction: NonNullable<StatementDto["transactions"]>[number]): StatementTransactionView => ({
  ...transaction,
  id: transaction.id,
  _id: transaction.id,
  statementId: transaction.statementId,
  amount: transaction.amount,
  note: transaction.note,
  transactionDate: transaction.transactionDate,
  impact: transaction.impact,
});
const toLegacyStatement = (value: StatementDto): CardStatementView => ({
  _id: value.id,
  userCardId: value.cardId,
  periodStartDate: value.periodStartDate,
  periodEndDate: value.periodEndDate,
  statementDate: value.statementDate,
  paymentDueDate: value.paymentDueDate,
  statementDaySnapshot: value.statementDaySnapshot,
  paymentDueDaysSnapshot: value.paymentDueDaysSnapshot,
  paymentStatus: value.paymentStatus,
  effectivePaymentStatus: value.effectivePaymentStatus,
  paidAt: value.paidAt,
  paidAmount: value.paidAmount,
  summary: {
    totalOutcome: value.summary.statementAmount,
    totalIncome: value.summary.reimbursementReceived,
    totalServiceFee: 0,
    cashbackByRate: 0,
    expectedCashback: 0,
    eligibleCashback: 0,
    actualCashback: 0,
    exceededCashback: 0,
    remainingCashback: null,
    expectedNetProfit: 0,
    actualNetProfit: 0,
    annualEligibleSpend: 0,
    transactionCount: value.summary.transactionCount,
    totalAmountDue: value.summary.statementAmount,
    outstandingAmount: value.summary.outstandingAmount,
    cashbackCap: { capAmount: null, unlimited: true, cashbackByRate: 0, eligibleCashback: 0, actualCashback: 0, exceededCashback: 0, remainingCashback: null, capUsedPercent: null },
  },
  transactions: value.transactions?.map(toLegacyTransaction),
});
const parseStatementList = (value: unknown) => (statementListSchema.parse(value) as StatementDto[]).map(toLegacyStatement);
const parseStatement = (value: unknown) => toLegacyStatement(statementSchema.parse(value) as StatementDto);
export const fetchCardStatements = async (cardId: string) => parseStatementList(await request<unknown>(`/api/cards/${cardId}/statements?timestamp=${Date.now()}`, { cache: "no-store" }));
export const fetchAllCardStatements = async () => parseStatementList(await request<unknown>(`/api/card-statements?timestamp=${Date.now()}`, { cache: "no-store" }));
export const fetchStatementDetail = async (cardId: string, statementId: string) => parseStatement(await request<unknown>(`/api/cards/${cardId}/statements/${statementId}?timestamp=${Date.now()}`, { cache: "no-store" }));
export const updateStatementPayment = async (cardId: string, statementId: string, action: StatementPaymentAction, repaymentAccountId?: string) => {
  const payload = statementPaymentInputSchema.parse({ action, ...(repaymentAccountId ? { repaymentAccountId } : {}) });
  return toLegacyStatement(statementSchema.parse(await request<unknown>(`/api/cards/${cardId}/statements/${statementId}/payment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })) as StatementDto);
};
