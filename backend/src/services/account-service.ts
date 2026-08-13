import { AccountModel } from "../models/account.js";
import { FinancialTransactionModel } from "../models/financial-transaction.js";
import { ApiError } from "../errors.js";
import { idOf, plain } from "../statement-domain.js";
import { accountGroup, type AccountType } from "../financial-domain.js";
import { CardStatementModel } from "../models/card-statement.js";
import type { ServiceContext } from "./types/service-context.js";
import crypto from "node:crypto";
import { McpMutationModel } from "../models/mcp-mutation.js";

type CreateAccountInput = {
  name: string;
  type: AccountType;
  creditCardId?: string;
  openingBalance?: number;
};

const serialize = (value: unknown) => {
  const item = plain(value);
  return {
    id: idOf(item._id),
    name: item.name,
    type: item.type,
    group: accountGroup(item.type as AccountType),
    currency: item.currency ?? "VND",
    active: item.active !== false,
    creditCardId: item.creditCardId ? idOf(item.creditCardId) : null,
    openingBalance: Number(item.openingBalance ?? 0),
  };
};

export class AccountService {
  static async list(ctx: ServiceContext) {
    const accounts = await AccountModel.find({ workspaceId: ctx.workspaceId })
      .sort({ active: -1, createdAt: -1 })
      .lean();
    const [balances, payments] = await Promise.all([FinancialTransactionModel.aggregate([
      { $match: { workspaceId: ctx.workspaceId } },
      { $group: { _id: "$accountId", debitCashflow: { $sum: "$debitCashflow" }, creditDebt: { $sum: "$creditDebt" } } },
    ]), FinancialTransactionModel.find({ workspaceId: ctx.workspaceId, transactionType: "STATEMENT_PAYMENT", statementId: { $ne: null } }).select({ amount: 1, statementId: 1 }).lean()]);
    const balanceById = new Map(balances.map((item) => [String(item._id), item]));
    const statementIds = payments.map((item) => item.statementId).filter(Boolean);
    const statements = statementIds.length
      ? await CardStatementModel.find({ _id: { $in: statementIds }, workspaceId: ctx.workspaceId }).select({ _id: 1, userCardId: 1 }).lean()
      : [];
    const statementCardById = new Map(statements.map((item) => [String(item._id), String(item.userCardId)]));
    const creditAccountByCardId = new Map(accounts.filter((account) => String(account.type) === "CREDIT" && account.creditCardId).map((account) => [String(account.creditCardId), String(account._id)]));
    const paidByCreditAccount = new Map<string, number>();
    for (const payment of payments) {
      const cardId = statementCardById.get(String(payment.statementId));
      const accountId = cardId ? creditAccountByCardId.get(cardId) : undefined;
      if (accountId) paidByCreditAccount.set(accountId, (paidByCreditAccount.get(accountId) ?? 0) + Number(payment.amount ?? 0));
    }
    return accounts.map((account) => {
      const totals = balanceById.get(String(account._id)) ?? { debitCashflow: 0, creditDebt: 0 };
      const openingBalance = Number(account.openingBalance ?? 0);
      return {
        ...serialize(account),
        currentBalance: openingBalance + (String(account.type) === "CREDIT" ? 0 : Number(totals.debitCashflow ?? 0)),
        currentDebt: openingBalance + Number(totals.creditDebt ?? 0) - (paidByCreditAccount.get(String(account._id)) ?? 0),
      };
    });
  }

  static async create(ctx: ServiceContext, input: CreateAccountInput, idempotencyKey?: string) {
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
    const operation = "create_account";
    const payloadHash = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
    if (idempotencyKey) {
      const existingMutation = await McpMutationModel.findOne({ workspaceId: ctx.workspaceId, operation, idempotencyKey }).lean();
      if (existingMutation) {
        if (existingMutation.payloadHash !== payloadHash) throw new ApiError(409, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency key đã dùng cho payload khác.");
        return existingMutation.result;
      }
    }
    try {
      const account = await AccountModel.create({
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        name,
        type: input.type,
        creditCardId: input.creditCardId ?? null,
        openingBalance: input.openingBalance ?? 0,
      });
      const result = serialize(account);
      if (idempotencyKey) await McpMutationModel.create({ workspaceId: ctx.workspaceId, userId: ctx.userId, operation, idempotencyKey, payloadHash, result });
      return result;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const existing = await AccountModel.findOne({ workspaceId: ctx.workspaceId, name, type: input.type, active: { $ne: false } }).lean();
        if (existing) {
          const result = serialize(existing);
          if (idempotencyKey) {
            try { await McpMutationModel.create({ workspaceId: ctx.workspaceId, userId: ctx.userId, operation, idempotencyKey, payloadHash, result }); } catch (mutationError) { if ((mutationError as { code?: number }).code !== 11000) throw mutationError; }
          }
          return result;
        }
        throw new ApiError(409, "ACCOUNT_EXISTS", "Tài khoản đã tồn tại trong workspace.");
      }
      throw error;
    }
  }
}
