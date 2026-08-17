import mongoose from "mongoose";
import { calculateFinancialImpact, type AccountType } from "../financial-domain.js";
import { FinancialTransactionModel } from "../models/financial-transaction.js";
import { AccountModel } from "../models/account.js";
import { CreditCardModel } from "../models/credit-card.js";
import { CardStatementModel } from "../models/card-statement.js";
import { ApiError } from "../errors.js";
import { idOf, plain, statementPeriod, validDate } from "../statement-domain.js";
import type { ServiceContext } from "./types/service-context.js";
import { McpMutationModel } from "../models/mcp-mutation.js";
import { FINANCIAL_TRANSACTION_DEFAULT_LIMIT, FINANCIAL_TRANSACTION_MAX_LIMIT, financialTransactionListSchema, financialTransactionSchema } from "@card-credit/contracts";
import type { CreateFinancialTransactionInput as SharedCreateFinancialTransactionInput, CreateFinancialTransactionBatchInput as SharedCreateFinancialTransactionBatchInput, FinancialTransactionDto } from "@card-credit/contracts";
import { canonicalPayloadHash, legacyPayloadHash, payloadHashMatches } from "../command-hash.js";
import { commandGuardService, type CommandInvocation } from "./command-guard-service.js";

export type CreateFinancialTransactionInput = SharedCreateFinancialTransactionInput;
export type CreateFinancialTransactionBatchInput = SharedCreateFinancialTransactionBatchInput;

const serialize = (value: unknown): FinancialTransactionDto => {
  const item = plain(value);
  return financialTransactionSchema.parse({
    id: idOf(item._id),
    accountId: idOf(item.accountId),
    statementId: item.statementId ? idOf(item.statementId) : null,
    reimbursementForTransactionId: item.reimbursementForTransactionId ? idOf(item.reimbursementForTransactionId) : null,
    accountType: item.accountType,
    transactionType: item.transactionType,
    ownership: item.ownership,
    amount: item.amount,
    serviceFeeRate: typeof item.serviceFeeRate === "number" ? item.serviceFeeRate : null,
    categoryId: item.categoryId,
    transactionDate: item.transactionDate,
    note: item.note ?? "",
    impact: {
      personalSpending: item.personalSpending,
      debitCashflow: item.debitCashflow,
      creditDebt: item.creditDebt,
      outstandingReceivable: item.outstandingReceivable,
      reimbursementReceived: typeof item.reimbursementReceived === "number" ? item.reimbursementReceived : 0,
    },
  }) as FinancialTransactionDto;
};

const normalizedNote = (note: unknown) => {
  if (note === undefined) return "";
  if (typeof note !== "string" || note.trim().length > 1000) {
    throw new ApiError(400, "INVALID_TRANSACTION", "Ghi chú giao dịch không hợp lệ.");
  }
  return note.trim();
};

export class FinancialTransactionService {
  static async preview(ctx: ServiceContext, input: CreateFinancialTransactionBatchInput) {
    if (input.items.some((item) => item.transactionType === "STATEMENT_PAYMENT")) {
      throw new ApiError(409, "STATEMENT_PAYMENT_COMMAND_REQUIRED", "Thanh toán sao kê phải đi qua command thanh toán sao kê.");
    }
    const items = [];
    for (const item of input.items) {
      const account = await AccountModel.findOne({ _id: item.accountId, workspaceId: ctx.workspaceId, active: { $ne: false } }).lean();
      if (!account) throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
      const accountType = String(account.type) as AccountType;
      const paidForOtherCredit = accountType === "CREDIT" && (item.ownership ?? "PERSONAL") === "PAID_FOR_OTHER";
      if (paidForOtherCredit && item.serviceFeeRate === undefined) throw new ApiError(400, "SERVICE_FEE_REQUIRED", "Thanh toán hộ Credit phải có serviceFeeRate.");
      const reimbursementExpected = paidForOtherCredit
        ? Math.round(item.amount * (1 - Number(item.serviceFeeRate) / 100))
        : item.reimbursementExpected;
      const impact = calculateFinancialImpact({ accountType, transactionType: item.transactionType, ownership: item.ownership, amount: item.amount, reimbursementExpected, refundReceived: item.refundReceived, cashbackReceived: item.cashbackReceived, serviceFeeRate: item.serviceFeeRate });
      items.push({ ...item, reimbursementExpected, previewImpact: impact });
    }
    return { items };
  }

  static async createBatch(ctx: ServiceContext, input: CreateFinancialTransactionBatchInput, invocation: CommandInvocation) {
    if (input.items.length < 1 || input.items.length > 50) throw new ApiError(400, "INVALID_TRANSACTION_BATCH", "Batch phải từ 1 đến 50 giao dịch.");
    if (input.items.some((item) => item.transactionType === "STATEMENT_PAYMENT")) throw new ApiError(409, "STATEMENT_PAYMENT_COMMAND_REQUIRED", "Thanh toán sao kê phải đi qua command thanh toán sao kê.");
    const operation = "import_financial_transaction_batch";
    const payloadHash = canonicalPayloadHash(input);
    const legacyHash = legacyPayloadHash(input);
    const idempotencyKey = invocation.idempotencyKey.trim();
    return commandGuardService.execute(ctx, {
      operation,
      idempotencyKey,
      payloadHash,
      endpointOrTool: invocation.endpointOrTool,
      previewId: invocation.previewId,
      confirmationTokenHash: invocation.confirmationTokenHash,
      previewPayloadHash: invocation.previewPayloadHash,
      resource: { type: "financial_transaction_batch" },
    }, async (session) => {
      const existing = await McpMutationModel.findOne({ workspaceId: ctx.workspaceId, operation, idempotencyKey }).session(session).lean();
      if (existing) {
        if (!payloadHashMatches(existing.payloadHash, payloadHash, legacyHash)) throw new ApiError(409, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency key đã dùng cho payload khác.");
        return existing.result;
      }
      const items = [];
      for (const item of input.items) items.push(await this.createInternal(ctx, item, session));
      return { count: items.length, items };
    });
  }

  static async create(ctx: ServiceContext, input: CreateFinancialTransactionInput, invocation: CommandInvocation) {
    if (input.transactionType === "STATEMENT_PAYMENT") throw new ApiError(409, "STATEMENT_PAYMENT_COMMAND_REQUIRED", "Thanh toán sao kê phải đi qua command thanh toán sao kê.");
    const operation = "import_financial_transaction";
    const payloadHash = canonicalPayloadHash(input);
    const legacyHash = legacyPayloadHash(input);
    const idempotencyKey = invocation.idempotencyKey.trim();
    return commandGuardService.execute(ctx, {
      operation,
      idempotencyKey,
      payloadHash,
      endpointOrTool: invocation.endpointOrTool,
      previewId: invocation.previewId,
      confirmationTokenHash: invocation.confirmationTokenHash,
      previewPayloadHash: invocation.previewPayloadHash,
      resource: { type: "financial_transaction" },
    }, async (session) => {
      const existing = await McpMutationModel.findOne({ workspaceId: ctx.workspaceId, operation, idempotencyKey }).session(session).lean();
      if (existing) {
        if (!payloadHashMatches(existing.payloadHash, payloadHash, legacyHash)) throw new ApiError(409, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency key đã dùng cho payload khác.");
        return existing.result as Record<string, unknown>;
      }
      return this.createInternal(ctx, input, session);
    });
  }

  private static async createInternal(ctx: ServiceContext, input: CreateFinancialTransactionInput, session?: mongoose.ClientSession) {
    if (input.transactionType === "STATEMENT_PAYMENT") {
      throw new ApiError(409, "STATEMENT_PAYMENT_COMMAND_REQUIRED", "Thanh toán sao kê phải đi qua command thanh toán sao kê.");
    }
    if (input.transactionType === "TRANSFER") throw new ApiError(400, "TRANSFER_NOT_SUPPORTED", "Chuyển tiền cần chỉ định tài khoản nguồn và đích; chưa thể ghi như giao dịch đơn.");
    if (!mongoose.isValidObjectId(input.accountId)) {
      throw new ApiError(400, "INVALID_ACCOUNT_ID", "accountId không hợp lệ.");
    }
    if (!validDate(input.transactionDate)) {
      throw new ApiError(400, "INVALID_DATE", "Ngày giao dịch phải theo YYYY-MM-DD.");
    }
    const account = await AccountModel.findOne({ _id: input.accountId, workspaceId: ctx.workspaceId, active: { $ne: false } }).session(session ?? null).lean();
    if (!account) throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
    const accountType = String(account.type) as AccountType;
    const isPaidForOtherCredit = accountType === "CREDIT" && (input.ownership ?? "PERSONAL") === "PAID_FOR_OTHER";
    if (isPaidForOtherCredit && input.serviceFeeRate === undefined) throw new ApiError(400, "SERVICE_FEE_REQUIRED", "Thanh toán hộ Credit phải có serviceFeeRate.");
    const effectiveReimbursementExpected = isPaidForOtherCredit
      ? Math.round(input.amount * (1 - Number(input.serviceFeeRate) / 100))
      : input.reimbursementExpected;
    const impact = calculateFinancialImpact({
      accountType,
      transactionType: input.transactionType,
      ownership: input.ownership,
      amount: input.amount,
      serviceFeeRate: input.serviceFeeRate ?? 0,
      reimbursementExpected: effectiveReimbursementExpected,
      refundReceived: input.refundReceived,
      cashbackReceived: input.cashbackReceived,
    });
    let statementId: mongoose.Types.ObjectId | null = input.statementId && mongoose.isValidObjectId(input.statementId)
      ? new mongoose.Types.ObjectId(input.statementId)
      : null;
    if (input.statementId && !statementId) throw new ApiError(400, "INVALID_STATEMENT_ID", "statementId không hợp lệ.");
    let reimbursementForTransactionId: mongoose.Types.ObjectId | null = null;
    if (input.reimbursementForTransactionId) {
      if (!mongoose.isValidObjectId(input.reimbursementForTransactionId)) throw new ApiError(400, "INVALID_REIMBURSEMENT_SOURCE", "Giao dịch nguồn hoàn tiền không hợp lệ.");
      reimbursementForTransactionId = new mongoose.Types.ObjectId(input.reimbursementForTransactionId);
      const source = await FinancialTransactionModel.findOne({ _id: reimbursementForTransactionId, workspaceId: ctx.workspaceId, ownership: "PAID_FOR_OTHER", transactionType: "EXPENSE" }).session(session ?? null).lean();
      if (!source) throw new ApiError(404, "REIMBURSEMENT_SOURCE_NOT_FOUND", "Không tìm thấy giao dịch thanh toán hộ nguồn.");
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
      reimbursementForTransactionId,
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

  static async list(ctx: ServiceContext, filters: { accountId?: string; categoryId?: string; from?: string; to?: string; limit?: number } = {}) {
    const query: Record<string, unknown> = { workspaceId: ctx.workspaceId };
    if (filters.accountId) query.accountId = filters.accountId;
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.from || filters.to) query.transactionDate = { ...(filters.from ? { $gte: filters.from } : {}), ...(filters.to ? { $lte: filters.to } : {}) };
    const limit = Math.min(Math.max(filters.limit ?? FINANCIAL_TRANSACTION_DEFAULT_LIMIT, 1), FINANCIAL_TRANSACTION_MAX_LIMIT);
    const items = await FinancialTransactionModel.find(query).sort({ transactionDate: -1, createdAt: -1 }).limit(limit).lean();
    return financialTransactionListSchema.parse(items.map(serialize)) as FinancialTransactionDto[];
  }
}
