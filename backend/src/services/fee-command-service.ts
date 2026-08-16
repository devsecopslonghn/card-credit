import mongoose from "mongoose";
import { ApiError } from "../errors.js";
import { CardFeePaymentModel } from "../models/card-fee-payment.js";
import type { ServiceContext } from "./types/service-context.js";
import { CardQueryService } from "./card-query-service.js";

type Data = Record<string, unknown>;
export type FeeCenterCategory = "ANNUAL_CARD_FEE" | "MANAGEMENT_FEE" | "OTHER_FEE" | "BANK_CASHBACK" | "PARTNER_REFUND";
const categories = new Set<FeeCenterCategory>(["ANNUAL_CARD_FEE", "MANAGEMENT_FEE", "OTHER_FEE", "BANK_CASHBACK", "PARTNER_REFUND"]);

const cardId = async (ctx: ServiceContext, value: string) => CardQueryService.get(ctx, value);
const feePaymentId = (value: string) => {
  if (!mongoose.isValidObjectId(value)) throw new ApiError(400, "INVALID_FEE_PAYMENT_ID", "Fee payment id không hợp lệ.");
  return value;
};
const feeCenterId = (value: string) => {
  if (!mongoose.isValidObjectId(value)) throw new ApiError(400, "INVALID_FEE_ID", "Fee id không hợp lệ.");
  return value;
};
const paymentDate = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) throw new ApiError(400, "INVALID_FEE_PAYMENT", "Ngày đóng phí không hợp lệ.", { paymentDate: "Ngày đóng phí phải có dạng YYYY-MM-DD." });
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new ApiError(400, "INVALID_FEE_PAYMENT", "Ngày đóng phí không hợp lệ.", { paymentDate: "Ngày đóng phí phải là ngày dương lịch hợp lệ." });
  return value;
};
const amount = (value: unknown, code: "INVALID_FEE_PAYMENT" | "INVALID_FEE") => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new ApiError(400, code, code === "INVALID_FEE_PAYMENT" ? "Số tiền phí không hợp lệ." : "Số tiền phí phải là số nguyên VND lớn hơn 0.", { amount: "Số tiền phải là số nguyên VND lớn hơn 0." });
  return value;
};
const note = (value: unknown, code: "INVALID_FEE_PAYMENT" | "INVALID_FEE") => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || (code === "INVALID_FEE_PAYMENT" ? value.length : value.trim().length) > 1000) throw new ApiError(400, code, code === "INVALID_FEE_PAYMENT" ? "Ghi chú phí không hợp lệ." : "Ghi chú phí tối đa 1000 ký tự.", { note: "Ghi chú tối đa 1000 ký tự." });
  return value.trim();
};
export const parseFeeCenterCategory = (value: unknown): FeeCenterCategory => {
  if (typeof value !== "string" || !categories.has(value as FeeCenterCategory)) throw new ApiError(400, "INVALID_FEE", "Loại phí không hợp lệ.");
  return value as FeeCenterCategory;
};

export class FeeCommandService {
  static async createCardPayment(ctx: ServiceContext, card: string, body: Data) {
    await cardId(ctx, card);
    return CardFeePaymentModel.create({ workspaceId: ctx.workspaceId, userId: ctx.userId, userCardId: card, paymentDate: paymentDate(body.paymentDate), amount: amount(body.amount, "INVALID_FEE_PAYMENT"), note: note(body.note, "INVALID_FEE_PAYMENT") });
  }

  static async updateCardPayment(ctx: ServiceContext, card: string, payment: string, body: Data) {
    await cardId(ctx, card);
    feePaymentId(payment);
    const record = await CardFeePaymentModel.findOneAndUpdate({ _id: payment, workspaceId: ctx.workspaceId, userCardId: card }, { $set: { paymentDate: paymentDate(body.paymentDate), amount: amount(body.amount, "INVALID_FEE_PAYMENT"), note: note(body.note, "INVALID_FEE_PAYMENT") } }, { returnDocument: "after", runValidators: true });
    if (!record) throw new ApiError(404, "FEE_PAYMENT_NOT_FOUND", "Không tìm thấy phí thẻ.");
    return record;
  }

  static async deleteCardPayment(ctx: ServiceContext, card: string, payment: string) {
    await cardId(ctx, card);
    feePaymentId(payment);
    const result = await CardFeePaymentModel.deleteOne({ _id: payment, workspaceId: ctx.workspaceId, userCardId: card });
    if (result.deletedCount === 0) throw new ApiError(404, "FEE_PAYMENT_NOT_FOUND", "Không tìm thấy phí thẻ.");
  }

  static async createCenter(ctx: ServiceContext, body: Data) {
    const card = String(body.cardId ?? "");
    await cardId(ctx, card);
    return CardFeePaymentModel.create({ workspaceId: ctx.workspaceId, userId: ctx.userId, userCardId: body.cardId, category: parseFeeCenterCategory(body.category), paymentDate: paymentDate(body.paymentDate), amount: amount(body.amount, "INVALID_FEE"), note: note(body.note, "INVALID_FEE") });
  }

  static async updateCenter(ctx: ServiceContext, id: string, body: Data) {
    feeCenterId(id);
    if (body.cardId) await cardId(ctx, String(body.cardId));
    const record = await CardFeePaymentModel.findOneAndUpdate({ _id: id, workspaceId: ctx.workspaceId }, { $set: { userCardId: body.cardId, category: parseFeeCenterCategory(body.category), paymentDate: paymentDate(body.paymentDate), amount: amount(body.amount, "INVALID_FEE"), note: note(body.note, "INVALID_FEE") } }, { returnDocument: "after", runValidators: true });
    if (!record) throw new ApiError(404, "FEE_NOT_FOUND", "Không tìm thấy khoản phí.");
    return record;
  }

  static async deleteCenter(ctx: ServiceContext, id: string) {
    feeCenterId(id);
    await CardFeePaymentModel.deleteOne({ _id: id, workspaceId: ctx.workspaceId });
    return { deletedId: id };
  }
}
