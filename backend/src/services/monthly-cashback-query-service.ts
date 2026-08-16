import mongoose from "mongoose";
import {
  monthlyCashbackListSchema,
  monthlyCashbackSchema,
  type MonthlyCashbackDto,
} from "@card-credit/contracts";
import { ApiError } from "../errors.js";
import { MonthlyCardCashbackModel } from "../models/monthly-card-cashback.js";
import { CardQueryService } from "./card-query-service.js";
import type { ServiceContext } from "./types/service-context.js";
import { idOf, plain } from "../statement-domain.js";

const validCardId = (cardId: string) => {
  if (!mongoose.isValidObjectId(cardId)) throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
};

const validYear = (year: string) => {
  if (!/^\d{4}$/.test(year)) throw new ApiError(400, "INVALID_YEAR", "Năm không hợp lệ.");
};

const timestamp = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
};

export const monthlyCashbackDtoFromDocument = (value: unknown): MonthlyCashbackDto => {
  const item = plain(value);
  return monthlyCashbackSchema.parse({
    id: idOf(item._id ?? item.id),
    cardId: idOf(item.userCardId ?? item.cardId),
    period: item.period,
    expectedAmount: Number(item.expectedAmount ?? 0),
    actualAmount: item.status === "RECEIVED" && item.actualAmount !== null && item.actualAmount !== undefined
      ? Number(item.actualAmount)
      : null,
    status: item.status,
    receivedAt: timestamp(item.receivedAt),
    note: typeof item.note === "string" ? item.note : "",
  }) as MonthlyCashbackDto;
};

export class MonthlyCashbackQueryService {
  static async list(ctx: ServiceContext, cardId: string, year: string): Promise<MonthlyCashbackDto[]> {
    validCardId(cardId);
    validYear(year);
    await CardQueryService.get(ctx, cardId);
    const records = await MonthlyCardCashbackModel.find({
      workspaceId: ctx.workspaceId,
      userCardId: cardId,
      period: { $gte: `${year}-01`, $lte: `${year}-12` },
    }).sort({ period: -1 }).lean();
    return monthlyCashbackListSchema.parse(records.map(monthlyCashbackDtoFromDocument)) as MonthlyCashbackDto[];
  }
}
