import { AccountModel } from "../models/account.js";
import { CreditCardModel } from "../models/credit-card.js";
import { FinancialTransactionModel } from "../models/financial-transaction.js";
import { ApiError } from "../errors.js";
import { idOf, plain } from "../statement-domain.js";
import { accountGroup, type AccountType } from "../financial-domain.js";
import type { ServiceContext } from "./types/service-context.js";
import { McpMutationModel } from "../models/mcp-mutation.js";
import type { AccountDto, CreateAccountInput } from "@card-credit/contracts";
import mongoose from "mongoose";
import { canonicalPayloadHash, legacyPayloadHash, payloadHashMatches } from "../command-hash.js";
import { commandGuardService, type CommandInvocation } from "./command-guard-service.js";
import { StatementQueryService } from "./statement-query-service.js";

const serialize = (value: unknown): AccountDto => {
  const item = plain(value) as Record<string, unknown>;
  return {
    id: idOf(item._id),
    name: String(item.name ?? ""),
    type: item.type as AccountType,
    group: accountGroup(item.type as AccountType),
    currency: "VND",
    active: item.active !== false,
    creditCardId: item.creditCardId ? idOf(item.creditCardId) : null,
    openingBalance: Number(item.openingBalance ?? 0),
    currentBalance: 0,
    currentDebt: 0,
  };
};

export class AccountService {
  static async list(ctx: ServiceContext) {
    const accounts = await AccountModel.find({ workspaceId: ctx.workspaceId })
      .sort({ active: -1, createdAt: -1 })
      .lean();
    const hasLinkedCreditAccount = accounts.some((account) => String(account.type) === "CREDIT" && account.creditCardId);
    const [balances, statements] = await Promise.all([
      FinancialTransactionModel.aggregate([
        { $match: { workspaceId: ctx.workspaceId } },
        { $group: { _id: "$accountId", debitCashflow: { $sum: "$debitCashflow" }, creditDebt: { $sum: "$creditDebt" } } },
      ]),
      hasLinkedCreditAccount ? StatementQueryService.list(ctx, { includeTransactions: false }) : Promise.resolve([]),
    ]);
    const balanceById = new Map(balances.map((item) => [String(item._id), item]));
    const outstandingByCardId = new Map<string, number>();
    for (const statement of statements) {
      const cardId = String(statement.cardId ?? "");
      if (!cardId) continue;
      const outstanding = Number(statement.summary?.outstandingAmount ?? 0);
      outstandingByCardId.set(cardId, (outstandingByCardId.get(cardId) ?? 0) + Math.max(0, outstanding));
    }
    return accounts.map((account): AccountDto => {
      const totals = balanceById.get(String(account._id)) ?? { debitCashflow: 0, creditDebt: 0 };
      const openingBalance = Number(account.openingBalance ?? 0);
      const isLinkedCreditAccount = String(account.type) === "CREDIT" && account.creditCardId;
      return {
        ...serialize(account),
        currentBalance: openingBalance + (String(account.type) === "CREDIT" ? 0 : Number(totals.debitCashflow ?? 0)),
        // Statement payments belong to the repayment account, but their statementId
        // points to the CREDIT account's statement. Use the statement ledger for
        // linked cards so payments reduce the card debt exactly once.
        currentDebt: isLinkedCreditAccount
          ? Math.max(0, openingBalance + (outstandingByCardId.get(String(account.creditCardId)) ?? 0))
          : Math.max(0, openingBalance + Number(totals.creditDebt ?? 0)),
      };
    });
  }

  private static async createInternal(ctx: ServiceContext, input: CreateAccountInput, session?: mongoose.ClientSession): Promise<AccountDto> {
    const name = input.name.trim();
    if (!name || name.length > 120) {
      throw new ApiError(400, "INVALID_ACCOUNT", "Tên tài khoản không hợp lệ.");
    }
    if (!Number.isSafeInteger(input.openingBalance ?? 0) || (input.openingBalance ?? 0) < 0) {
      throw new ApiError(400, "INVALID_ACCOUNT", "Số dư ban đầu không hợp lệ.");
    }
    if (input.type !== "CREDIT" && input.creditCardId) {
      throw new ApiError(400, "INVALID_ACCOUNT", "Chỉ tài khoản CREDIT mới được liên kết thẻ.");
    }
    if (input.type === "CREDIT" && input.creditCardId) {
      if (!mongoose.isValidObjectId(input.creditCardId)) {
        throw new ApiError(400, "INVALID_CARD_ID", "Tham chiếu thẻ không hợp lệ.");
      }
      const cardQuery = CreditCardModel.findOne({
        _id: input.creditCardId,
        workspaceId: ctx.workspaceId,
        active: { $ne: false },
      });
      const card = await (session ? cardQuery.session(session) : cardQuery).lean();
      if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
    }
    const record = {
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      name,
      type: input.type,
      creditCardId: input.creditCardId ?? null,
      openingBalance: input.openingBalance ?? 0,
    };
    try {
      const account = session
        ? (await AccountModel.create([record], { session }))[0]
        : await AccountModel.create(record);
      if (!account) throw new Error("Account was not created");
      const result = serialize(account);
      return result;
    } catch (error) {
      if (session) {
        if ((error as { code?: number }).code === 11000) throw new ApiError(409, "ACCOUNT_EXISTS", "Tài khoản đã tồn tại trong workspace.");
        throw error;
      }
      if ((error as { code?: number }).code === 11000) {
        const existing = await AccountModel.findOne({ workspaceId: ctx.workspaceId, name, type: input.type, active: { $ne: false } }).lean();
        if (existing) {
          const result = serialize(existing);
          return result;
        }
        throw new ApiError(409, "ACCOUNT_EXISTS", "Tài khoản đã tồn tại trong workspace.");
      }
      throw error;
    }
  }

  static async create(ctx: ServiceContext, input: CreateAccountInput, invocation: CommandInvocation): Promise<AccountDto> {
    const name = input.name.trim();
    if (!name || name.length > 120) throw new ApiError(400, "INVALID_ACCOUNT", "Tên tài khoản không hợp lệ.");
    if (!Number.isSafeInteger(input.openingBalance ?? 0) || (input.openingBalance ?? 0) < 0) throw new ApiError(400, "INVALID_ACCOUNT", "Số dư ban đầu không hợp lệ.");
    if (input.type !== "CREDIT" && input.creditCardId) throw new ApiError(400, "INVALID_ACCOUNT", "Chỉ tài khoản CREDIT mới được liên kết thẻ.");
    const operation = "create_account";
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
      resource: { type: "account" },
    }, async (session) => {
      const existingMutation = await McpMutationModel.findOne({ workspaceId: ctx.workspaceId, operation, idempotencyKey }).session(session).lean();
      if (existingMutation) {
        if (!payloadHashMatches(existingMutation.payloadHash, payloadHash, legacyHash)) throw new ApiError(409, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency key đã dùng cho payload khác.");
        return existingMutation.result as AccountDto;
      }
      return this.createInternal(ctx, input, session);
    });
  }
}
