import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import { browserServiceContext } from "./context.js";
import { ApiError } from "./errors.js";
import { CardFeePaymentModel } from "./models/card-fee-payment.js";
import { CreditCardModel } from "./models/credit-card.js";
import { FeeQueryService } from "./services/fee-query-service.js";
import type { AuthRepository } from "./auth-repository.js";

type Data = Record<string, unknown>;
type Category = "ANNUAL_CARD_FEE" | "MANAGEMENT_FEE" | "OTHER_FEE" | "BANK_CASHBACK" | "PARTNER_REFUND";
const categories = new Set<Category>(["ANNUAL_CARD_FEE", "MANAGEMENT_FEE", "OTHER_FEE", "BANK_CASHBACK", "PARTNER_REFUND"]);
const date = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value) || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) throw new ApiError(400, "INVALID_FEE", "Ngày phát sinh phí không hợp lệ.");
  return value;
};
const amount = (value: unknown) => { if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new ApiError(400, "INVALID_FEE", "Số tiền phí phải là số nguyên VND lớn hơn 0."); return value; };
const category = (value: unknown): Category => { if (typeof value !== "string" || !categories.has(value as Category)) throw new ApiError(400, "INVALID_FEE", "Loại phí không hợp lệ."); return value as Category; };
const note = (value: unknown) => { if (value === undefined || value === null) return ""; if (typeof value !== "string" || value.trim().length > 1000) throw new ApiError(400, "INVALID_FEE", "Ghi chú phí tối đa 1000 ký tự."); return value.trim(); };
const serialized = (value: unknown) => JSON.parse(JSON.stringify(value)) as Data;
const card = async (cardId: string, workspaceId: string) => { if (!mongoose.isValidObjectId(cardId)) throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ."); const item = await CreditCardModel.findOne({ _id: cardId, workspaceId }); if (!item) throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ."); return item; };

export const registerFeeCenterRoutes = (app: FastifyInstance, secret: string, users?: Pick<AuthRepository, "findUserById">) => {
  app.get<{ Querystring: { cardId?: string; category?: string } }>("/api/fee-center", async (request) => {
    const context = await browserServiceContext(request, secret, users);
    return { data: await FeeQueryService.listCenter(context, {
      cardId: request.query.cardId,
      category: request.query.category ? category(request.query.category) : undefined,
    }) };
  });
  app.post<{ Body: Data }>("/api/fee-center", async (request, reply) => {
    const session = sessionFromRequest(request, secret); const body = request.body ?? {};
    await card(String(body.cardId ?? ""), session.workspaceId);
    const record = await CardFeePaymentModel.create({ workspaceId: session.workspaceId, userId: session.userId, userCardId: body.cardId, category: category(body.category), paymentDate: date(body.paymentDate), amount: amount(body.amount), note: note(body.note) });
    return reply.code(201).send({ data: serialized(record) });
  });
  app.put<{ Params: { id: string }; Body: Data }>("/api/fee-center/:id", async (request) => {
    const session = sessionFromRequest(request, secret); if (!mongoose.isValidObjectId(request.params.id)) throw new ApiError(400, "INVALID_FEE_ID", "Fee id không hợp lệ."); const body = request.body ?? {};
    if (body.cardId) await card(String(body.cardId), session.workspaceId);
    const record = await CardFeePaymentModel.findOneAndUpdate({ _id: request.params.id, workspaceId: session.workspaceId }, { $set: { userCardId: body.cardId, category: category(body.category), paymentDate: date(body.paymentDate), amount: amount(body.amount), note: note(body.note) } }, { returnDocument: "after", runValidators: true });
    if (!record) throw new ApiError(404, "FEE_NOT_FOUND", "Không tìm thấy khoản phí."); return { data: serialized(record) };
  });
  app.delete<{ Params: { id: string } }>("/api/fee-center/:id", async (request) => { const session = sessionFromRequest(request, secret); if (!mongoose.isValidObjectId(request.params.id)) throw new ApiError(400, "INVALID_FEE_ID", "Fee id không hợp lệ."); const result = await CardFeePaymentModel.deleteOne({ _id: request.params.id, workspaceId: session.workspaceId }); if (!result.deletedCount) throw new ApiError(404, "FEE_NOT_FOUND", "Không tìm thấy khoản phí."); return { data: { deletedId: request.params.id } }; });
};
