import mongoose from "mongoose";
import { CardStatementModel } from "../models/card-statement.js";
import { CardTransactionModel } from "../models/card-transaction.js";
import { CreditCardModel } from "../models/credit-card.js";
import {
  derived,
  effectivePaymentStatus,
  idOf,
  plain,
  summarize,
  type Data,
} from "../statement-domain.js";
import type { ServiceContext } from "./types/service-context.js";
import type { TransactionListFilters, TransactionServiceResult } from "./types/transaction.dto.js";

const Cards = CreditCardModel as mongoose.Model<Data>;
const transactionJson = (transaction: unknown, statement?: unknown, card?: Data) => {
  const value = plain(transaction);
  return {
    ...value,
    _id: idOf(value._id),
    userCardId: idOf(value.userCardId),
    statementId: idOf(value.statementId),
    derived: derived(value),
    statement: statement && card ? statementJson(statement, [], card) : undefined,
    card: card ? {
      _id: idOf(card._id),
      providerName: card.providerName ?? card.bank,
      displayName: card.displayName ?? card.name,
      network: card.network ?? card.type,
      owner: card.owner ?? "Tôi",
    } : undefined,
  };
};
const statementJson = (statement: unknown, transactions: Data[], card: Data) => {
  const value = plain(statement);
  return {
    ...value,
    _id: idOf(value._id),
    userCardId: idOf(value.userCardId),
    effectivePaymentStatus: effectivePaymentStatus(value),
    summary: summarize(transactions, card.cashbackCapAmount),
    cashbackCapAmount: card.cashbackCapAmount ?? null,
    cashbackCapPeriod: card.cashbackCapPeriod ?? "STATEMENT",
  };
};

export class TransactionService {
  static async list(ctx: ServiceContext, filters: TransactionListFilters): Promise<TransactionServiceResult[]> {
    const query: Data = { workspaceId: ctx.workspaceId };
    if (filters.date) query.transactionDate = filters.date;
    if (filters.cardId) query.userCardId = filters.cardId;
    if (filters.statementId) query.statementId = filters.statementId;
    const items = await CardTransactionModel.find(query).sort({ transactionDate: -1, createdAt: -1 });
    const values = items.map(plain);
    const cardIds = [...new Set(values.map((item) => idOf(item.userCardId)).filter(Boolean))];
    const statementIds = [...new Set(values.map((item) => idOf(item.statementId)).filter(Boolean))];
    const [cards, statements] = await Promise.all([
      cardIds.length ? Cards.find({ _id: { $in: cardIds }, workspaceId: ctx.workspaceId }) : [],
      statementIds.length ? CardStatementModel.find({ _id: { $in: statementIds }, workspaceId: ctx.workspaceId }) : [],
    ]);
    const cardById = new Map(cards.map((card) => [idOf(card._id), plain(card)]));
    const statementById = new Map(statements.map((statement) => [idOf(statement._id), statement]));
    return items.map((item, index) => transactionJson(
      item,
      statementById.get(idOf(values[index]?.statementId)),
      cardById.get(idOf(values[index]?.userCardId)),
    ));
  }

  static serializeTransaction(transaction: unknown, statement?: unknown, card?: Data) {
    return transactionJson(transaction, statement, card);
  }

  static serializeStatement(statement: unknown, transactions: Data[], card: Data) {
    return statementJson(statement, transactions, card);
  }
}
