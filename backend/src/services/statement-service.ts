import { CardStatementModel } from "../models/card-statement.js";
import { CardTransactionModel } from "../models/card-transaction.js";
import { CreditCardModel } from "../models/credit-card.js";
import { effectivePaymentStatus, idOf, plain, summarize } from "../statement-domain.js";
import type { ServiceContext } from "./types/service-context.js";

export class StatementService {
  static async getSummary(ctx: ServiceContext, statementId: string) {
    const statement = await CardStatementModel.findOne({ _id: statementId, workspaceId: ctx.workspaceId }).lean();
    if (!statement) return null;
    const card = await CreditCardModel.findOne({ _id: statement.userCardId, workspaceId: ctx.workspaceId }).lean();
    if (!card) return null;
    const transactions = (await CardTransactionModel.find({ statementId: statement._id, workspaceId: ctx.workspaceId }).lean()).map(plain);
    const cardValue = plain(card);
    const value = plain(statement);
    return {
      id: idOf(value._id),
      cardId: idOf(value.userCardId),
      statementDate: String(value.statementDate),
      periodStartDate: String(value.periodStartDate),
      periodEndDate: String(value.periodEndDate),
      paymentDueDate: String(value.paymentDueDate),
      paymentStatus: value.paymentStatus,
      effectivePaymentStatus: effectivePaymentStatus(value),
      summary: summarize(transactions, cardValue.cashbackCapAmount),
      currency: "VND",
    };
  }

  static async listUpcoming(ctx: ServiceContext, limit = 20) {
    const statements = await CardStatementModel.find({
      workspaceId: ctx.workspaceId,
      paymentStatus: { $ne: "PAID" },
    }).sort({ paymentDueDate: 1 }).limit(Math.min(Math.max(limit, 1), 50)).lean();
    const result = [];
    for (const statement of statements) {
      const summary = await this.getSummary(ctx, idOf(statement._id));
      if (summary) result.push(summary);
    }
    return result;
  }
}
