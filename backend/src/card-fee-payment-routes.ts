import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import { browserServiceContext } from "./context.js";
import { ApiError } from "./errors.js";
import { CreditCardModel } from "./models/credit-card.js";
import { CardFeePaymentModel } from "./models/card-fee-payment.js";
import { FeeQueryService } from "./services/fee-query-service.js";
import type { AuthRepository } from "./auth-repository.js";

type Data = Record<string, unknown>;

const validObjectId = (value: string, field: "card" | "payment") => {
  if (!mongoose.isValidObjectId(value))
    throw new ApiError(
      400,
      field === "card" ? "INVALID_CARD_ID" : "INVALID_FEE_PAYMENT_ID",
      field === "card"
        ? "Card id không hợp lệ."
        : "Fee payment id không hợp lệ.",
    );
};

const paymentDate = (value: unknown) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)
  )
    throw new ApiError(400, "INVALID_FEE_PAYMENT", "Ngày đóng phí không hợp lệ.", {
      paymentDate: "Ngày đóng phí phải có dạng YYYY-MM-DD.",
    });
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value)
    throw new ApiError(400, "INVALID_FEE_PAYMENT", "Ngày đóng phí không hợp lệ.", {
      paymentDate: "Ngày đóng phí phải là ngày dương lịch hợp lệ.",
    });
  return value;
};

const amount = (value: unknown) => {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  )
    throw new ApiError(400, "INVALID_FEE_PAYMENT", "Số tiền phí không hợp lệ.", {
      amount: "Số tiền phải là số nguyên VND lớn hơn 0.",
    });
  return value;
};

const note = (value: unknown) => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > 1000)
    throw new ApiError(400, "INVALID_FEE_PAYMENT", "Ghi chú phí không hợp lệ.", {
      note: "Ghi chú tối đa 1000 ký tự.",
    });
  return value.trim();
};

const serialize = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Data;

const requireCard = async (cardId: string, workspaceId: string) => {
  validObjectId(cardId, "card");
  const card = await CreditCardModel.findOne({ _id: cardId, workspaceId });
  if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
};

const recordFilter = (
  cardId: string,
  feePaymentId: string,
  workspaceId: string,
) => {
  validObjectId(feePaymentId, "payment");
  return {
    _id: feePaymentId,
    workspaceId,
    userCardId: cardId,
  };
};

export const registerCardFeePaymentRoutes = (
  app: FastifyInstance,
  secret: string,
  users?: Pick<AuthRepository, "findUserById">,
) => {
  app.get<{ Params: { cardId: string } }>(
    "/api/cards/:cardId/fee-payments",
    async (request) => {
      return { data: await FeeQueryService.listCardPayments(
        await browserServiceContext(request, secret, users),
        request.params.cardId,
      ) };
    },
  );

  app.post<{ Params: { cardId: string }; Body: Data }>(
    "/api/cards/:cardId/fee-payments",
    async (request, reply) => {
      const session = sessionFromRequest(request, secret);
      await requireCard(request.params.cardId, session.workspaceId);
      const body = request.body ?? {};
      const record = await CardFeePaymentModel.create({
        workspaceId: session.workspaceId,
        userId: session.userId,
        userCardId: request.params.cardId,
        paymentDate: paymentDate(body.paymentDate),
        amount: amount(body.amount),
        note: note(body.note),
      });
      return reply.code(201).send({ data: serialize(record) });
    },
  );

  app.put<{
    Params: { cardId: string; feePaymentId: string };
    Body: Data;
  }>("/api/cards/:cardId/fee-payments/:feePaymentId", async (request) => {
    const session = sessionFromRequest(request, secret);
    await requireCard(request.params.cardId, session.workspaceId);
    const body = request.body ?? {};
    const record = await CardFeePaymentModel.findOneAndUpdate(
      recordFilter(
        request.params.cardId,
        request.params.feePaymentId,
        session.workspaceId,
      ),
      {
        $set: {
          paymentDate: paymentDate(body.paymentDate),
          amount: amount(body.amount),
          note: note(body.note),
        },
      },
      { returnDocument: "after", runValidators: true },
    );
    if (!record)
      throw new ApiError(404, "FEE_PAYMENT_NOT_FOUND", "Không tìm thấy phí thẻ.");
    return { data: serialize(record) };
  });

  app.delete<{
    Params: { cardId: string; feePaymentId: string };
  }>("/api/cards/:cardId/fee-payments/:feePaymentId", async (request) => {
    const session = sessionFromRequest(request, secret);
    await requireCard(request.params.cardId, session.workspaceId);
    const result = await CardFeePaymentModel.deleteOne(
      recordFilter(
        request.params.cardId,
        request.params.feePaymentId,
        session.workspaceId,
      ),
    );
    if (result.deletedCount === 0)
      throw new ApiError(404, "FEE_PAYMENT_NOT_FOUND", "Không tìm thấy phí thẻ.");
    return { message: "Đã xóa phí thẻ." };
  });
};
