import {
  effectivePaymentStatus,
  idOf,
  plain,
  summarize,
  type Data,
} from "../statement-domain.js";
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
  static serializeStatement(statement: unknown, transactions: Data[], card: Data) {
    return statementJson(statement, transactions, card);
  }
}
