import mongoose from "mongoose";
import crypto from "node:crypto";
import { calculateFinancialImpact, type AccountType, type FinancialTransactionType, type Ownership } from "../financial-domain.js";
import { FinancialTransactionModel } from "../models/financial-transaction.js";
import { AccountModel } from "../models/account.js";
import { CreditCardModel } from "../models/credit-card.js";
import { CardStatementModel } from "../models/card-statement.js";
import { ApiError } from "../errors.js";
import { idOf, plain, statementPeriod, validDate } from "../statement-domain.js";
import type { ServiceContext } from "./types/service-context.js";
import { McpMutationModel } from "../models/mcp-mutation.js";

export type CreateFinancialTransactionInput = {
  accountId: string;
  transactionDate: string;
  amount: number;
  categoryId?: string;
  transactionType?: FinancialTransactionType;
  ownership?: Ownership;
  reimbursementExpected?: number;
  refundReceived?: number;
  cashbackReceived?: number;
  note?: string;
  statementId?: string;
};
export type CreateFinancialTransactionBatchInput = { items: CreateFinancialTransactionInput[] };

const serialize = (value: unknown) => {
  const item = plain(value);
  return {
    id: idOf(item._id),
    accountId: idOf(item.accountId),
    statementId: item.statementId ? idOf(item.statementId) : null,
    accountType: item.accountType,
    transactionType: item.transactionType,
    ownership: item.ownership,
    amount: item.amount,
    categoryId: item.categoryId,
    transactionDate: item.transactionDate,
    note: item.note ?? "",
    impact: {
      personalSpending: item.personalSpending,
      debitCashflow: item.debitCashflow,
      creditDebt: item.creditDebt,
      outstandingReceivable: item.outstandingReceivable,
      reimbursementReceived: item.reimbursementReceived,
    },
  };
};

const normalizedNote = (note: unknown) => {
  if (note === undefined) return "";
  if (typeof note !== "string" || note.trim().length > 1000) {
    throw new ApiError(400, "INVALID_TRANSACTION", "Ghi chú giao dịch không hợp lệ.");
  }
  return note.trim();
};

export class FinancialTransactionService {
  static async createBatch(ctx: ServiceContext, input: CreateFinancialTransactionBatchInput, idempotencyKey: string) {
    if (input.items.length < 1 || input.items.length > 50) throw new ApiError(400, "INVALID_TRANSACTION_BATCH", "Batch phải từ 1 đến 50 giao dịch.");
    if (idempotencyKey.trim().length < 8) throw new ApiError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency key không hợp lệ.");
    const session = await mongoose.startSession();
    try {
      let output: unknown;
      await session.withTransaction(async () => {
        const operation = "import_financial_transaction_batch";
        const payloadHash = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
        const existing = await McpMutationModel.findOne({ workspaceId: ctx.workspaceId, operation, idempotencyKey }).session(session).lean();
        if (existing) {
          if (existing.payloadHash !== payloadHash) throw new ApiError(409, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency key đã dùng cho payload khác.");
          output = existing.result;
          return;
        }
        const items = [];
        for (const item of input.items) items.push(await this.createInternal(ctx, item, session));
        output = { count: items.length, items };
        await McpMutationModel.create([{ workspaceId: ctx.workspaceId, userId: ctx.userId, operation, idempotencyKey, payloadHash, result: output }], { session });
      });
      return output;
    } finally { await session.endSession(); }
  }

  static async create(ctx: ServiceContext, input: CreateFinancialTransactionInput, idempotencyKey?: string) {
    if (!idempotencyKey) return this.createInternal(ctx, input);
    if (idempotencyKey.trim().length < 8) throw new ApiError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency key không hợp lệ.");
    const session = await mongoose.startSession();
    try {
      let output: Record<string, unknown> | undefined;
      await session.withTransaction(async () => {
        const operation = "import_financial_transaction";
        const payloadHash = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
        const existing = await McpMutationModel.findOne({ workspaceId: ctx.workspaceId, operation, idempotencyKey }).session(session).lean();
        if (existing) {
          if (existing.payloadHash !== payloadHash) throw new ApiError(409, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency key đã dùng cho payload khác.");
          output = existing.result as Record<string, unknown>;
          return;
        }
        output = await this.createInternal(ctx, input, session);
        await McpMutationModel.create([{ workspaceId: ctx.workspaceId, userId: ctx.userId, operation, idempotencyKey, payloadHash, result: output }], { session });
      });
      return output;
    } finally { await session.endSession(); }
  }

  private static async createInternal(ctx: ServiceContext, input: CreateFinancialTransactionInput, session?: mongoose.ClientSession) {
    if (!mongoose.isValidObjectId(input.accountId)) {
      throw new ApiError(400, "INVALID_ACCOUNT_ID", "accountId không hợp lệ.");
    }
    if (!validDate(input.transactionDate)) {
      throw new ApiError(400, "INVALID_DATE", "Ngày giao dịch phải theo YYYY-MM-DD.");
    }
    const account = await AccountModel.findOne({ _id: input.accountId, workspaceId: ctx.workspaceId, active: { $ne: false } }).session(session ?? null).lean();
    if (!account) throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
    const accountType = String(account.type) as AccountType;
    const effectiveReimbursementExpected = input.reimbursementExpected ?? (
      accountType === "CREDIT" && input.ownership === "PAID_FOR_OTHER" ? Math.round(input.amount * 0.95) : undefined
    );
    const impact = calculateFinancialImpact({
      accountType,
      transactionType: input.transactionType,
      ownership: input.ownership,
      amount: input.amount,
      reimbursementExpected: effectiveReimbursementExpected,
      refundReceived: input.refundReceived,
      cashbackReceived: input.cashbackReceived,
    });
    let statementId: mongoose.Types.ObjectId | null = input.statementId && mongoose.isValidObjectId(input.statementId)
      ? new mongoose.Types.ObjectId(input.statementId)
      : null;
    if (input.statementId && !statementId) throw new ApiError(400, "INVALID_STATEMENT_ID", "statementId không hợp lệ.");
    if (input.transactionType === "STATEMENT_PAYMENT") {
      if (!statementId) throw new ApiError(400, "STATEMENT_REQUIRED", "Thanh toán sao kê phải có statementId.");
      const statement = await CardStatementModel.findOne({ _id: statementId, workspaceId: ctx.workspaceId }).session(session ?? null).lean();
      if (!statement) throw new ApiError(404, "STATEMENT_NOT_FOUND", "Không tìm thấy sao kê.");
    }
    let card: Record<string, unknown> | null = null;
    if (accountType === "CREDIT") {
      if (!account.creditCardId) throw new ApiError(409, "ACCOUNT_CARD_NOT_LINKED", "Tài khoản CREDIT chưa liên kết thẻ.");
      card = await CreditCardModel.findOne({ _id: account.creditCardId, workspaceId: ctx.workspaceId, active: { $ne: false } }).session(session ?? null).lean();
      if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ liên kết với tài khoản.");
      const period = statementPeriod(input.transactionDate, Number(card.statementDay ?? 1), Number(card.paymentDueDays ?? 15));
      const statement = await CardStatementModel.findOneAndUpdate(
        { workspaceId: ctx.workspaceId, userCardId: card._id, statementDate: period.statementDate },
        { $setOnInsert: { userId: ctx.userId, workspaceId: ctx.workspaceId, userCardId: card._id, ...period, paymentStatus: "OPEN", paidAt: null, paidAmount: null } },
        { upsert: true, returnDocument: "after", session },
      ).lean();
      statementId = statement?._id ? new mongoose.Types.ObjectId(String(statement._id)) : null;
    }
    const created = await FinancialTransactionModel.create([{
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      accountId: account._id,
      statementId,
      accountType,
      transactionType: input.transactionType ?? "EXPENSE",
      ownership: input.ownership ?? "PERSONAL",
      amount: input.amount,
      reimbursementExpected: effectiveReimbursementExpected ?? 0,
      refundReceived: input.refundReceived ?? 0,
      cashbackReceived: input.cashbackReceived ?? 0,
      categoryId: input.categoryId?.trim() || "OTHER",
      transactionDate: input.transactionDate,
      note: normalizedNote(input.note),
      ...impact,
    }], { session });
    return serialize(created[0]);
  }

  static async list(ctx: ServiceContext, filters: { accountId?: string; categoryId?: string; from?: string; to?: string } = {}) {
    const query: Record<string, unknown> = { workspaceId: ctx.workspaceId };
    if (filters.accountId) query.accountId = filters.accountId;
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.from || filters.to) query.transactionDate = { ...(filters.from ? { $gte: filters.from } : {}), ...(filters.to ? { $lte: filters.to } : {}) };
    const items = await FinancialTransactionModel.find(query).sort({ transactionDate: -1, createdAt: -1 }).lean();
    return items.map(serialize);
  }
}
