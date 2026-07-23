import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import { CreditCardModel } from "./models/credit-card.js";
import { CardTransactionModel } from "./models/card-transaction.js";
import { CardStatementModel } from "./models/card-statement.js";
import { MonthlyCardCashbackModel } from "./models/monthly-card-cashback.js";
import { CardFeePaymentModel } from "./models/card-fee-payment.js";
import { ApiError } from "./errors.js";
import { idOf, plain, summarize, type Data } from "./statement-domain.js";

const Cards = CreditCardModel as mongoose.Model<Data>;
type ReportFilters = {
  owner: string | null;
  cardId: string | null;
  year: string | null;
  month: string | null;
};
type BankCashbackTotals = {
  monthlyBankCashbackExpected: number;
  monthlyBankCashbackActual: number;
  monthlyBankCashbackRejected: number;
};

const reportFilters = (query: {
  owner?: string;
  cardId?: string;
  year?: string;
  month?: string;
}): ReportFilters => {
  const owner = query.owner?.trim() || null;
  const cardId = query.cardId?.trim() || null;
  const year = query.year?.trim() || null;
  const month = query.month?.trim() || null;
  if (
    year &&
    (!/^\d{4}$/.test(year) || Number(year) < 1000 || Number(year) > 9998)
  )
    throw new ApiError(400, "INVALID_REPORT_FILTER", "Năm báo cáo không hợp lệ.");
  if (month && (!year || !/^(0[1-9]|1[0-2])$/.test(month)))
    throw new ApiError(400, "INVALID_REPORT_FILTER", "Tháng báo cáo không hợp lệ.");
  if (cardId && !mongoose.isValidObjectId(cardId))
    throw new ApiError(400, "INVALID_REPORT_FILTER", "Card id báo cáo không hợp lệ.");
  return { owner, cardId, year, month };
};

const dateFilter = (
  filters: ReportFilters,
  field: "transactionDate" | "paymentDate",
) => {
  if (!filters.year) return {};
  if (filters.month) {
    const next = new Date(
      Date.UTC(Number(filters.year), Number(filters.month), 1),
    );
    return {
      [field]: {
        $gte: `${filters.year}-${filters.month}-01`,
        $lt: next.toISOString().slice(0, 10),
      },
    };
  }
  return {
    [field]: {
      $gte: `${filters.year}-01-01`,
      $lt: `${String(Number(filters.year) + 1).padStart(4, "0")}-01-01`,
    },
  };
};

const periodFilter = (filters: ReportFilters) => {
  if (!filters.year) return {};
  if (filters.month) return { period: `${filters.year}-${filters.month}` };
  return {
    period: { $gte: `${filters.year}-01`, $lte: `${filters.year}-12` },
  };
};

const bankCashbackTotals = (items: Data[]) =>
  items.reduce<BankCashbackTotals>(
    (totals, item) => {
      const expected = Number(item.expectedAmount ?? 0);
      if (item.status === "PENDING" || item.status === "RECEIVED")
        totals.monthlyBankCashbackExpected += expected;
      if (item.status === "RECEIVED")
        totals.monthlyBankCashbackActual += Number(item.actualAmount ?? 0);
      if (item.status === "REJECTED")
        totals.monthlyBankCashbackRejected += expected;
      return totals;
    },
    {
      monthlyBankCashbackExpected: 0,
      monthlyBankCashbackActual: 0,
      monthlyBankCashbackRejected: 0,
    },
  );

export const registerReportRoutes = (app: FastifyInstance, secret: string) =>
  app.get<{
    Querystring: {
      owner?: string;
      cardId?: string;
      year?: string;
      month?: string;
    };
  }>(
    "/api/reports/summary",
    async (request) => {
      const session = sessionFromRequest(request, secret);
      const filters = reportFilters(request.query);
      const cards = await Cards.find({
        workspaceId: session.workspaceId,
        ...(filters.owner ? { owner: filters.owner } : {}),
        ...(filters.cardId ? { _id: filters.cardId } : {}),
      })
        .sort({ bank: 1, name: 1 })
        .lean();
      const ids = cards.map((card) => card._id);
      const [transactions, statements, monthlyCashbacks, feePayments] =
        await Promise.all([
        CardTransactionModel.find({
          workspaceId: session.workspaceId,
          userCardId: { $in: ids },
          ...dateFilter(filters, "transactionDate"),
        })
          .sort({ transactionDate: 1 })
          .lean(),
        CardStatementModel.find({
          workspaceId: session.workspaceId,
          userCardId: { $in: ids },
        })
          .sort({ statementDate: 1 })
          .lean(),
        MonthlyCardCashbackModel.find({
          workspaceId: session.workspaceId,
          userCardId: { $in: ids },
          ...periodFilter(filters),
        })
          .sort({ period: 1 })
          .lean(),
        CardFeePaymentModel.find({
          workspaceId: session.workspaceId,
          userCardId: { $in: ids },
          ...dateFilter(filters, "paymentDate"),
        })
          .sort({ paymentDate: 1 })
          .lean(),
      ]);
      const byCard = new Map<string, Data[]>();
      for (const item of transactions.map(plain))
        byCard.set(idOf(item.userCardId), [
          ...(byCard.get(idOf(item.userCardId)) ?? []),
          item,
        ]);
      const statementsByCard = new Map<string, Data[]>();
      for (const item of statements.map(plain))
        statementsByCard.set(idOf(item.userCardId), [
          ...(statementsByCard.get(idOf(item.userCardId)) ?? []),
          item,
        ]);
      const cashbacksByCard = new Map<string, Data[]>();
      for (const item of monthlyCashbacks.map(plain))
        cashbacksByCard.set(idOf(item.userCardId), [
          ...(cashbacksByCard.get(idOf(item.userCardId)) ?? []),
          item,
        ]);
      const feesByCard = new Map<string, Data[]>();
      for (const item of feePayments.map(plain))
        feesByCard.set(idOf(item.userCardId), [
          ...(feesByCard.get(idOf(item.userCardId)) ?? []),
          item,
        ]);
      const summaries = cards.map((card) => {
        const id = idOf(card._id);
        const transactionTotals = summarize(
          byCard.get(id) ?? [],
          card.cashbackCapAmount,
        );
        const cashbackTotals = bankCashbackTotals(cashbacksByCard.get(id) ?? []);
        const totalPaidCardFees = (feesByCard.get(id) ?? []).reduce(
          (sum, item) => sum + Number(item.amount ?? 0),
          0,
        );
        const totals = {
          ...transactionTotals,
          ...cashbackTotals,
          totalPaidCardFees,
          actualNetBenefit:
            cashbackTotals.monthlyBankCashbackActual -
            Number(transactionTotals.totalServiceFee ?? 0) -
            totalPaidCardFees,
        };
        return {
          id,
          _id: id,
          createdAt: card.createdAt ?? null,
          presetId: card.presetId ?? null,
          providerCode: card.providerCode ?? null,
          providerName: card.providerName ?? card.bank,
          displayName: card.displayName ?? card.name,
          network: card.network ?? card.type,
          imageUrl: card.imageUrl ?? null,
          legacy: card.legacy ?? !card.presetId,
          bank: card.bank,
          name: card.name,
          type: card.type,
          owner: card.owner || "Tôi",
          statementDay: card.statementDay ?? 1,
          paymentDueDays: card.paymentDueDays ?? 15,
          annualFee: card.annualFee ?? null,
          annualFeeWaiverTarget:
            card.annualFeeWaiverTarget ?? card.targetSpendForWaiver ?? 0,
          cashbackCapAmount: card.cashbackCapAmount ?? null,
          cashbackCapPeriod: card.cashbackCapPeriod ?? "STATEMENT",
          active: card.active !== false,
          totals,
          statements: (statementsByCard.get(id) ?? []).map((statement) => ({
            id: idOf(statement._id),
            statementDate: statement.statementDate,
            paymentDueDate: statement.paymentDueDate,
            paymentStatus: statement.paymentStatus,
            paidAt: statement.paidAt ?? null,
            paidAmount: statement.paidAmount ?? null,
          })),
        };
      });
      const totals = summaries.reduce(
        (sum, card) => {
          for (const field of [
            "totalOutcome",
            "totalIncome",
            "totalServiceFee",
            "expectedCashback",
            "actualCashback",
            "cashbackByRate",
            "eligibleCashback",
            "exceededCashback",
            "expectedNetProfit",
            "actualNetProfit",
            "annualEligibleSpend",
            "totalAmountDue",
            "monthlyBankCashbackExpected",
            "monthlyBankCashbackActual",
            "monthlyBankCashbackRejected",
            "totalPaidCardFees",
            "actualNetBenefit",
          ] as const)
            sum[field] += Number(card.totals[field] ?? 0);
          return sum;
        },
        {
          totalOutcome: 0,
          totalIncome: 0,
          totalServiceFee: 0,
          expectedCashback: 0,
          actualCashback: 0,
          cashbackByRate: 0,
          eligibleCashback: 0,
          exceededCashback: 0,
          expectedNetProfit: 0,
          actualNetProfit: 0,
          annualEligibleSpend: 0,
          totalAmountDue: 0,
          monthlyBankCashbackExpected: 0,
          monthlyBankCashbackActual: 0,
          monthlyBankCashbackRejected: 0,
          totalPaidCardFees: 0,
          actualNetBenefit: 0,
        },
      );
      return {
        generatedAt: new Date().toISOString(),
        filters,
        totals,
        cards: summaries,
      };
    },
  );
