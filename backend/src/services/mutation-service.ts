import crypto from "node:crypto";
import mongoose from "mongoose";
import { ApiError } from "../errors.js";
import { CardStatementModel } from "../models/card-statement.js";
import { CardTransactionModel } from "../models/card-transaction.js";
import { CreditCardModel } from "../models/credit-card.js";
import { McpMutationModel } from "../models/mcp-mutation.js";
import { idOf, plain, statementPeriod, summarize, transactionInput, type Data } from "../statement-domain.js";
import { TransactionService } from "./transaction-service.js";
import type { ServiceContext } from "./types/service-context.js";

const hash = (value: unknown) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const mutationKey = (ctx: ServiceContext, operation: string, key: string) => ({ workspaceId: ctx.workspaceId, operation, idempotencyKey: key });
const audit = async (ctx: ServiceContext, operation: string, resource: Record<string, unknown>, session: mongoose.ClientSession) => {
  await mongoose.connection.collection("authauditlogs").insertOne({ event: `MCP_${operation.toUpperCase()}`, userId: ctx.userId, workspaceId: ctx.workspaceId, resource, source: "mcp", createdAt: new Date(), updatedAt: new Date() }, { session });
};

export class MutationService {
  static async createTransaction(ctx: ServiceContext, input: Data, idempotencyKey: string) {
    if (!idempotencyKey.trim()) throw new ApiError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency key là bắt buộc.");
    const normalized = transactionInput(input);
    const cardId = input.userCardId ?? input.cardId;
    if (typeof cardId !== "string" || !mongoose.isValidObjectId(cardId)) throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
    const session = await mongoose.startSession();
    try {
      let output: Record<string, unknown> | undefined;
      await session.withTransaction(async () => {
        const existing = await McpMutationModel.findOne({ ...mutationKey(ctx, "create_transaction", idempotencyKey) } as Record<string, unknown>).session(session).lean();
        const payloadHash = hash({ cardId, normalized });
        if (existing) {
          if (existing.payloadHash !== payloadHash) throw new ApiError(409, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency key đã được dùng cho payload khác.");
          output = existing.result as Record<string, unknown>;
          return;
        }
        const card = await CreditCardModel.findOne({ _id: cardId, workspaceId: ctx.workspaceId }).session(session).lean();
        if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
        const period = statementPeriod(normalized.transactionDate, Number(card.statementDay ?? 1), Number(card.paymentDueDays ?? 15));
        const statement = await CardStatementModel.findOneAndUpdate({ workspaceId: ctx.workspaceId, userCardId: card._id, statementDate: period.statementDate }, { $setOnInsert: { userId: ctx.userId, workspaceId: ctx.workspaceId, userCardId: card._id, ...period, paymentStatus: "OPEN", paidAt: null, paidAmount: null } }, { upsert: true, returnDocument: "after", session });
        if (statement?.paymentStatus === "PAID") throw new ApiError(409, "STATEMENT_PAID_LOCKED", "Kỳ sao kê đã thanh toán.");
        const item = await CardTransactionModel.create([{ userId: ctx.userId, workspaceId: ctx.workspaceId, userCardId: card._id, statementId: statement?._id, ...normalized, cashbackStatus: "PENDING", actualCashbackAmount: null }], { session });
        output = TransactionService.serializeTransaction(item[0]!, statement, plain(card)) as Record<string, unknown>;
        await McpMutationModel.create([{ ...mutationKey(ctx, "create_transaction", idempotencyKey), payloadHash, result: output }], { session });
        await audit(ctx, "create_transaction", { id: idOf(item[0]!._id), cardId }, session);
      });
      return output;
    } finally { await session.endSession(); }
  }

  static async changePaymentStatus(ctx: ServiceContext, statementId: string, action: "CLOSED" | "PAID" | "REOPEN", idempotencyKey: string) {
    if (!mongoose.isValidObjectId(statementId)) throw new ApiError(400, "INVALID_STATEMENT_ID", "Statement id không hợp lệ.");
    const session = await mongoose.startSession();
    try {
      let output: Record<string, unknown> | undefined;
      await session.withTransaction(async () => {
        const existing = await McpMutationModel.findOne({ ...mutationKey(ctx, "change_payment_status", idempotencyKey) } as Record<string, unknown>).session(session).lean();
        const payloadHash = hash({ statementId, action });
        if (existing) {
          if (existing.payloadHash !== payloadHash) throw new ApiError(409, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency key đã được dùng cho payload khác.");
          output = existing.result as Record<string, unknown>;
          return;
        }
        const statement = await CardStatementModel.findOne({ _id: statementId, workspaceId: ctx.workspaceId }).session(session).lean();
        if (!statement) throw new ApiError(404, "STATEMENT_NOT_FOUND", "Không tìm thấy kỳ sao kê.");
        if (action === "CLOSED" && statement.paymentStatus === "PAID") throw new ApiError(409, "STATEMENT_PAID_LOCKED", "Kỳ sao kê đã thanh toán.");
        const card = await CreditCardModel.findOne({ _id: statement.userCardId, workspaceId: ctx.workspaceId }).session(session).lean();
        if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
        const transactions = (await CardTransactionModel.find({ statementId, workspaceId: ctx.workspaceId }).session(session).lean()).map(plain);
        const update = action === "REOPEN" ? { paymentStatus: "STATEMENT_CLOSED", paidAt: null, paidAmount: null } : action === "CLOSED" ? { paymentStatus: "STATEMENT_CLOSED" } : { paymentStatus: "PAID", paidAt: new Date(), paidAmount: summarize(transactions, card.cashbackCapAmount).totalAmountDue };
        const updated = await CardStatementModel.findOneAndUpdate({ _id: statementId, workspaceId: ctx.workspaceId, ...(action === "PAID" ? { paymentStatus: { $ne: "PAID" } } : {}) }, { $set: update }, { returnDocument: "after", session });
        if (!updated) throw new ApiError(409, "STATEMENT_STATE_CHANGED", "Trạng thái kỳ sao kê đã thay đổi. Vui lòng thử lại.");
        output = TransactionService.serializeStatement(updated, transactions, plain(card)) as Record<string, unknown>;
        await McpMutationModel.create([{ ...mutationKey(ctx, "change_payment_status", idempotencyKey), payloadHash, result: output }], { session });
        await audit(ctx, "change_payment_status", { statementId, action }, session);
      });
      return output;
    } finally { await session.endSession(); }
  }
}
