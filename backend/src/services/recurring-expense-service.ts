import mongoose from "mongoose";
import { RecurringExpenseModel } from "../models/recurring-expense.js";
import { AccountModel } from "../models/account.js";
import { ApiError } from "../errors.js";
import { idOf, plain, validDate } from "../statement-domain.js";
import type { ServiceContext } from "./types/service-context.js";
const Recurring = RecurringExpenseModel as unknown as mongoose.Model<Record<string, unknown>>;

export class RecurringExpenseService {
  static async list(ctx: ServiceContext) { return (await Recurring.find({ workspaceId: ctx.workspaceId }).sort({ nextDueDate: 1 }).lean()).map((item) => ({ ...plain(item), id: idOf(item._id), accountId: idOf(item.accountId) })); }
  static async create(ctx: ServiceContext, input: { name: string; categoryId: string; accountId: string; expectedAmount: number; nextDueDate: string }) {
    if (!mongoose.isValidObjectId(input.accountId) || !await AccountModel.exists({ _id: input.accountId, workspaceId: ctx.workspaceId })) throw new ApiError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.");
    if (!input.name.trim() || !validDate(input.nextDueDate) || !Number.isSafeInteger(input.expectedAmount) || input.expectedAmount <= 0) throw new ApiError(400, "INVALID_RECURRING_EXPENSE", "Khoản định kỳ không hợp lệ.");
    const item = await Recurring.create({ ...input, name: input.name.trim(), workspaceId: ctx.workspaceId, userId: ctx.userId });
    return { ...plain(item), id: idOf(item._id), accountId: idOf(item.accountId) };
  }
}
