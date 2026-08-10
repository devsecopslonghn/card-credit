import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import { CreditCardModel } from "./models/credit-card.js";
import { CardStatementModel } from "./models/card-statement.js";
import { CardTransactionModel } from "./models/card-transaction.js";
import { CardFeePaymentModel } from "./models/card-fee-payment.js";
import { MonthlyCardCashbackModel } from "./models/monthly-card-cashback.js";
import { buildMonthlyCashFlow, type CashFlowEvent } from "./cash-flow-domain.js";

const period = (value: unknown) => { if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error("INVALID_PERIOD"); return value; };
const monthRange = (value: string) => { const [year = 0, month = 1] = value.split("-").map(Number); const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10); return { start: `${value}-01`, next }; };
export const registerCashFlowRoutes = (app: FastifyInstance, secret: string) => app.get<{ Querystring: { period?: string; cardId?: string } }>("/api/cash-flow/monthly", async (request, reply) => {
  const session = sessionFromRequest(request, secret); const selectedPeriod = period(request.query.period ?? `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`); const range = monthRange(selectedPeriod);
  const cardQuery = { workspaceId: session.workspaceId, ...(request.query.cardId ? { _id: request.query.cardId } : {}) };
  const cards = await CreditCardModel.find(cardQuery).sort({ providerName: 1, displayName: 1 }).lean(); const ids = cards.map((card) => String(card._id));
  const [statements, fees, transactions, cashbacks] = await Promise.all([
    CardStatementModel.find({ workspaceId: session.workspaceId, userCardId: { $in: ids }, paidAt: { $gte: new Date(`${range.start}T00:00:00.000Z`), $lt: new Date(`${range.next}T00:00:00.000Z`) } }).lean(),
    CardFeePaymentModel.find({ workspaceId: session.workspaceId, userCardId: { $in: ids }, paymentDate: { $gte: range.start, $lt: range.next } }).lean(),
    CardTransactionModel.find({ workspaceId: session.workspaceId, userCardId: { $in: ids }, transactionDate: { $gte: range.start, $lt: range.next } }).lean(),
    MonthlyCardCashbackModel.find({ workspaceId: session.workspaceId, userCardId: { $in: ids }, period: selectedPeriod, status: "RECEIVED" }).lean(),
  ]);
  const events: CashFlowEvent[] = []; statements.forEach((item) => events.push({ cardId: String(item.userCardId), amount: Number(item.paidAmount ?? 0), kind: "STATEMENT_PAYMENT" })); fees.forEach((item) => events.push({ cardId: String(item.userCardId), amount: Number(item.amount ?? 0), kind: ["BANK_CASHBACK", "PARTNER_REFUND"].includes(String(item.category)) ? (String(item.category) === "BANK_CASHBACK" ? "BANK_CASHBACK" : "PARTNER_RETURN") : "FEE" })); transactions.forEach((item) => events.push({ cardId: String(item.userCardId), amount: Number(item.incomeAmount ?? 0), kind: "PARTNER_RETURN" })); cashbacks.forEach((item) => events.push({ cardId: String(item.userCardId), amount: Number(item.actualAmount ?? 0), kind: "BANK_CASHBACK" }));
  const data = buildMonthlyCashFlow(ids, selectedPeriod, events).map((item) => ({ ...item, card: cards.find((card) => String(card._id) === item.cardId) ?? null })); return reply.send({ data, period: selectedPeriod });
});
