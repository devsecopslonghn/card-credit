import mongoose from "mongoose";
import { monthlyCashFlowResponseSchema, type MonthlyCashFlowResponseDto, type MonthlyCashFlowRowDto } from "@card-credit/contracts";
import { ApiError } from "../errors.js";
import { AccountModel } from "../models/account.js";
import { CardStatementModel } from "../models/card-statement.js";
import { CreditCardModel } from "../models/credit-card.js";
import { FinancialTransactionModel } from "../models/financial-transaction.js";
import type { ServiceContext } from "./types/service-context.js";

const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const validPeriod = (value: unknown): value is string => typeof value === "string" && periodPattern.test(value);
const currentPeriod = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monthRange = (value: string) => {
  const [year = 0, month = 1] = value.split("-").map(Number);
  return { start: `${value}-01`, next: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10) };
};
const idOf = (value: unknown) => String(value ?? "");
const amount = (value: unknown) => Number(value ?? 0);

export class CashFlowQueryService {
  static async list(ctx: ServiceContext, options: { period?: string; cardId?: string } = {}): Promise<MonthlyCashFlowResponseDto> {
    const selectedPeriod = options.period ?? currentPeriod();
    if (!validPeriod(selectedPeriod)) throw new ApiError(400, "INVALID_PERIOD", "Kỳ tháng không hợp lệ.");
    if (options.cardId && !mongoose.isValidObjectId(options.cardId)) throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
    const range = monthRange(selectedPeriod);
    const cards = await CreditCardModel.find({ workspaceId: ctx.workspaceId, ...(options.cardId ? { _id: options.cardId } : {}) }).sort({ providerName: 1, displayName: 1 }).lean();
    const cardIds = cards.map((card) => card._id);
    const [accounts, statements, transactions] = await Promise.all([
      AccountModel.find({ workspaceId: ctx.workspaceId, type: "CREDIT", creditCardId: { $in: cardIds } }).lean(),
      CardStatementModel.find({ workspaceId: ctx.workspaceId, userCardId: { $in: cardIds } }).select({ _id: 1, userCardId: 1 }).lean(),
      FinancialTransactionModel.find({ workspaceId: ctx.workspaceId, transactionDate: { $gte: range.start, $lt: range.next } }).lean(),
    ]);
    const accountToCard = new Map(accounts.map((account) => [idOf(account._id), idOf(account.creditCardId)]));
    const statementToCard = new Map(statements.map((statement) => [idOf(statement._id), idOf(statement.userCardId)]));
    const data: MonthlyCashFlowRowDto[] = cards.map((card) => {
      const cardId = idOf(card._id);
      const own = transactions.filter((item) =>
        (item.accountType === "CREDIT" && accountToCard.get(idOf(item.accountId)) === cardId)
        || (item.transactionType === "STATEMENT_PAYMENT" && item.statementId && statementToCard.get(idOf(item.statementId)) === cardId));
      const statementPayments = own.filter((item) => item.transactionType === "STATEMENT_PAYMENT").reduce((sum, item) => sum + amount(item.amount), 0);
      const partnerReturns = own.filter((item) => item.transactionType === "REIMBURSEMENT" || item.transactionType === "REFUND").reduce((sum, item) => sum + amount(item.amount), 0);
      const actualFees = own.filter((item) => item.transactionType === "EXPENSE" && item.ownership === "PAID_FOR_OTHER").reduce((sum, item) => sum + Math.max(0, amount(item.amount) - amount(item.reimbursementExpected)), 0);
      const bankCashbackActual = own.reduce((sum, item) => sum + amount(item.cashbackReceived), 0);
      const row: MonthlyCashFlowRowDto = {
        cardId,
        period: selectedPeriod,
        totalOut: statementPayments,
        totalIn: partnerReturns,
        statementPayments,
        actualFees,
        partnerReturns,
        bankCashbackActual,
        netResult: partnerReturns - statementPayments,
        card: { id: cardId, providerName: typeof card.providerName === "string" ? card.providerName : null, displayName: typeof card.displayName === "string" ? card.displayName : null, owner: typeof card.owner === "string" ? card.owner : null },
      };
      return row;
    });
    return monthlyCashFlowResponseSchema.parse({ data, period: selectedPeriod }) as MonthlyCashFlowResponseDto;
  }
}
