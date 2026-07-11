import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import { CreditCardModel } from "./models/credit-card.js";
import { CardTransactionModel } from "./models/card-transaction.js";
import { CardStatementModel } from "./models/card-statement.js";
import { idOf, plain, summarize, type Data } from "./statement-domain.js";

const Cards = CreditCardModel as mongoose.Model<Data>;
export const registerReportRoutes = (app: FastifyInstance, secret: string) =>
  app.get<{ Querystring: { owner?: string } }>(
    "/api/reports/summary",
    async (request) => {
      const session = sessionFromRequest(request, secret);
      const owner = request.query.owner?.trim();
      const cards = await Cards.find({
        workspaceId: session.workspaceId,
        ...(owner ? { owner } : {}),
      })
        .sort({ bank: 1, name: 1 })
        .lean();
      const ids = cards.map((card) => card._id);
      const [transactions, statements] = await Promise.all([
        CardTransactionModel.find({
          workspaceId: session.workspaceId,
          userCardId: { $in: ids },
        })
          .sort({ transactionDate: 1 })
          .lean(),
        CardStatementModel.find({
          workspaceId: session.workspaceId,
          userCardId: { $in: ids },
        })
          .sort({ statementDate: 1 })
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
      const summaries = cards.map((card) => {
        const id = idOf(card._id);
        const totals = summarize(byCard.get(id) ?? [], card.cashbackCapAmount);
        return {
          id,
          _id: id,
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
        },
      );
      return {
        generatedAt: new Date().toISOString(),
        filters: { owner: owner || null },
        totals,
        cards: summaries,
      };
    },
  );
