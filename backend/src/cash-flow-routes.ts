import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import { CreditCardModel } from "./models/credit-card.js";
import { CardStatementModel } from "./models/card-statement.js";
import { AccountModel } from "./models/account.js";
import { FinancialTransactionModel } from "./models/financial-transaction.js";

const period = (value: unknown) => { if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error("INVALID_PERIOD"); return value; };
const monthRange = (value: string) => { const [year = 0, month = 1] = value.split("-").map(Number); return { start: `${value}-01`, next: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10) }; };

/** Compatibility endpoint: reads only the Financial Domain, never legacy card transactions. */
export const registerCashFlowRoutes = (app: FastifyInstance, secret: string) => app.get<{ Querystring: { period?: string; cardId?: string } }>("/api/cash-flow/monthly", async (request, reply) => {
  const session = sessionFromRequest(request, secret);
  const selectedPeriod = period(request.query.period ?? `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`);
  const range = monthRange(selectedPeriod);
  const cards = await CreditCardModel.find({ workspaceId: session.workspaceId, ...(request.query.cardId ? { _id: request.query.cardId } : {}) }).sort({ providerName: 1, displayName: 1 }).lean();
  const cardIds = cards.map((card) => card._id);
  const [accounts, statements, transactions] = await Promise.all([
    AccountModel.find({ workspaceId: session.workspaceId, type: "CREDIT", creditCardId: { $in: cardIds } }).lean(),
    CardStatementModel.find({ workspaceId: session.workspaceId, userCardId: { $in: cardIds } }).select({ _id: 1, userCardId: 1 }).lean(),
    FinancialTransactionModel.find({ workspaceId: session.workspaceId, transactionDate: { $gte: range.start, $lt: range.next } }).lean(),
  ]);
  const accountToCard = new Map(accounts.map((account) => [String(account._id), String(account.creditCardId)]));
  const statementToCard = new Map(statements.map((statement) => [String(statement._id), String(statement.userCardId)]));
  const rows = cards.map((card) => {
    const cardId = String(card._id);
    const own = transactions.filter((item) => (item.accountType === "CREDIT" && accountToCard.get(String(item.accountId)) === cardId) || (item.transactionType === "STATEMENT_PAYMENT" && item.statementId && statementToCard.get(String(item.statementId)) === cardId));
    const statementPayments = own.filter((item) => item.transactionType === "STATEMENT_PAYMENT").reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    const partnerReturns = own.filter((item) => item.transactionType === "REIMBURSEMENT" || item.transactionType === "REFUND").reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    const actualFees = own.filter((item) => item.transactionType === "EXPENSE" && item.ownership === "PAID_FOR_OTHER").reduce((sum, item) => sum + Math.max(0, Number(item.amount ?? 0) - Number(item.reimbursementExpected ?? 0)), 0);
    const bankCashbackActual = own.reduce((sum, item) => sum + Number(item.cashbackReceived ?? 0), 0);
    const totalOut = statementPayments;
    const totalIn = partnerReturns;
    return { cardId, period: selectedPeriod, totalOut, totalIn, statementPayments, actualFees, partnerReturns, bankCashbackActual, netResult: totalIn - totalOut, card };
  });
  return reply.send({ data: rows, period: selectedPeriod });
});
