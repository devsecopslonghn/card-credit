import { AccountModel } from "../models/account.js";
import { ApiError } from "../errors.js";
import { idOf, plain } from "../statement-domain.js";
import { accountGroup, type AccountType } from "../financial-domain.js";
import type { ServiceContext } from "./types/service-context.js";

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
    return accounts.map(serialize);
  }

  static async create(ctx: ServiceContext, input: CreateAccountInput) {
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
    try {
      const account = await AccountModel.create({
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        name,
        type: input.type,
        creditCardId: input.creditCardId ?? null,
        openingBalance: input.openingBalance ?? 0,
      });
      return serialize(account);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ApiError(409, "ACCOUNT_EXISTS", "Tài khoản đã tồn tại trong workspace.");
      }
      throw error;
    }
  }
}
