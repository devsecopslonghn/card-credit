import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import { browserServiceContext } from "./context.js";
import { ApiError } from "./errors.js";
import { CreditCardModel } from "./models/credit-card.js";
import { MonthlyCardCashbackModel } from "./models/monthly-card-cashback.js";
import { MonthlyCashbackQueryService } from "./services/monthly-cashback-query-service.js";
import type { AuthRepository } from "./auth-repository.js";

type Data = Record<string, unknown>;
type Status = "PENDING" | "RECEIVED" | "REJECTED";

const validCardId = (cardId: string) => {
  if (!mongoose.isValidObjectId(cardId))
    throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
};

const validPeriod = (value: string) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    throw new ApiError(400, "INVALID_PERIOD", "Kỳ cashback không hợp lệ.", {
      period: "Kỳ cashback phải có dạng YYYY-MM.",
    });
  return value;
};

const validYear = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}$/.test(value))
    throw new ApiError(400, "INVALID_YEAR", "Năm không hợp lệ.", {
      year: "Năm phải có dạng YYYY.",
    });
  return value;
};

const amount = (value: unknown, field: string) => {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  )
    throw new ApiError(400, "INVALID_CASHBACK", "Số tiền cashback không hợp lệ.", {
      [field]: "Số tiền phải là số nguyên VND không âm.",
    });
  return value;
};

const status = (value: unknown): Status => {
  if (value !== "PENDING" && value !== "RECEIVED" && value !== "REJECTED")
    throw new ApiError(400, "INVALID_CASHBACK_STATUS", "Trạng thái cashback không hợp lệ.");
  return value;
};

const note = (value: unknown) => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > 1000)
    throw new ApiError(400, "INVALID_CASHBACK", "Ghi chú cashback không hợp lệ.", {
      note: "Ghi chú tối đa 1000 ký tự.",
    });
  return value.trim();
};

const serialize = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Data;

const requireCard = async (cardId: string, workspaceId: string) => {
  validCardId(cardId);
  const card = await CreditCardModel.findOne({ _id: cardId, workspaceId });
  if (!card)
    throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
  return card;
};

export const registerMonthlyCardCashbackRoutes = (
  app: FastifyInstance,
  secret: string,
  users?: Pick<AuthRepository, "findUserById">,
) => {
  app.get<{
    Params: { cardId: string };
    Querystring: { year?: string };
  }>("/api/cards/:cardId/monthly-cashbacks", async (request) => {
    const context = await browserServiceContext(request, secret, users);
    return { data: await MonthlyCashbackQueryService.list(context, request.params.cardId, validYear(request.query.year)) };
  });

  app.put<{
    Params: { cardId: string; period: string };
    Body: Data;
  }>("/api/cards/:cardId/monthly-cashbacks/:period", async (request) => {
    const session = sessionFromRequest(request, secret);
    await requireCard(request.params.cardId, session.workspaceId);
    const period = validPeriod(request.params.period);
    const body = request.body ?? {};
    const nextStatus = status(body.status);
    const expectedAmount = amount(body.expectedAmount, "expectedAmount");
    const actualAmount =
      nextStatus === "RECEIVED"
        ? amount(body.actualAmount, "actualAmount")
        : null;
    const filter = {
      workspaceId: session.workspaceId,
      userCardId: request.params.cardId,
      period,
    };
    const existing = await MonthlyCardCashbackModel.findOne(filter);
    const existingData = existing ? serialize(existing) : null;
    const receivedAt =
      nextStatus === "RECEIVED"
        ? existingData?.status === "RECEIVED" && existingData.receivedAt
          ? new Date(String(existingData.receivedAt))
          : new Date()
        : null;
    const record = await MonthlyCardCashbackModel.findOneAndUpdate(
      filter,
      {
        $set: {
          expectedAmount,
          actualAmount,
          status: nextStatus,
          receivedAt,
          note: note(body.note),
        },
        $setOnInsert: {
          workspaceId: session.workspaceId,
          userId: session.userId,
          userCardId: request.params.cardId,
          period,
        },
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );
    return { data: serialize(record) };
  });

  app.delete<{
    Params: { cardId: string; period: string };
  }>("/api/cards/:cardId/monthly-cashbacks/:period", async (request) => {
    const session = sessionFromRequest(request, secret);
    await requireCard(request.params.cardId, session.workspaceId);
    const period = validPeriod(request.params.period);
    await MonthlyCardCashbackModel.deleteOne({
      workspaceId: session.workspaceId,
      userCardId: request.params.cardId,
      period,
    });
    return { message: "Đã xóa cashback tháng." };
  });
};
