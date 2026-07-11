import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { ApiError } from "./errors.js";
import { sessionFromRequest } from "./auth.js";
import { CardProductModel } from "./models/card-product.js";
import { CreditCardModel } from "./models/credit-card.js";
import { normalizeReminderPreferences } from "./reminder-preferences.js";

type Data = Record<string, unknown>;
const Cards = CreditCardModel as unknown as mongoose.Model<Data>;
const Products = CardProductModel as unknown as mongoose.Model<Data>;
const months = () => Array.from({ length: 12 }, (_, index) => ({ month: index + 1, spend: 0, cashback: 0, fee: 0, otherInterest: 0 }));
const plain = (value: unknown): Data => JSON.parse(JSON.stringify(value)) as Data;
const serialize = (value: unknown) => { const card = plain(value); return { ...card, providerName: card.providerName ?? card.bank, displayName: card.displayName ?? card.name, network: card.network ?? card.type, legacy: card.legacy ?? !card.presetId }; };
const owner = (value: unknown) => { if (typeof value !== "string" || !value.trim() || value.trim().length > 120) throw new ApiError(400, "INVALID_OWNER", "Tên chủ thẻ không hợp lệ.", { owner: "Tên chủ thẻ là bắt buộc và tối đa 120 ký tự." }); return value.trim().replace(/\s+/g, " "); };
const validId = (id: string) => { if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ."); };
const readable = async (id: string, workspaceId: string) => { validId(id); const card = await Cards.findOne({ _id: id, workspaceId }); if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ."); return card; };
const optionalNumber = (value: unknown, field: string) => { if (typeof value !== "number" || !Number.isFinite(value)) throw new ApiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", { [field]: `${field} phải là số.` }); return value; };
const fingerprint = (card: Data) => typeof card.workspaceId === "string" && typeof card.presetId === "string" && typeof card.owner === "string" ? `${card.workspaceId}::${card.presetId}::${card.owner.trim().replace(/\s+/g, " ")}` : null;
const mergeMonths = (target: unknown, source: unknown) => { const result = new Map<number, Data>(); for (const item of [...(Array.isArray(target) ? target : []), ...(Array.isArray(source) ? source : [])] as Data[]) { const month = Number(item.month); if (!Number.isInteger(month) || month < 1 || month > 12) continue; const current = result.get(month) ?? { month, spend: 0, cashback: 0, fee: 0, otherInterest: 0 }; for (const field of ["spend", "cashback", "fee", "otherInterest"]) current[field] = Number(current[field] ?? 0) + Number(item[field] ?? 0); result.set(month, current); } return [...result.values()].sort((a, b) => Number(a.month) - Number(b.month)); };

export const registerCardRoutes = (app: FastifyInstance, secret: string) => {
  app.get("/api/cards", async (request) => { const session = sessionFromRequest(request, secret); return (await Cards.find({ workspaceId: session.workspaceId }).sort({ createdAt: -1 })).map(serialize); });
  app.post<{ Body: Data }>("/api/cards", async (request, reply) => {
    const session = sessionFromRequest(request, secret); const body = request.body ?? {};
    if (typeof body.presetId === "string") {
      const productDoc = await Products.findOne({ presetId: body.presetId });
      if (!productDoc) throw new ApiError(404, "PRESET_NOT_FOUND", "Không tìm thấy Card Product.");
      const product = plain(productDoc);
      if (!product.active) throw new ApiError(409, "PRESET_INACTIVE", "Card Product hiện không còn hoạt động.");
      const card = await Cards.create({ userId: session.userId, workspaceId: session.workspaceId, presetId: product.presetId, providerCode: product.providerCode, providerName: product.providerName, displayName: product.displayName, network: product.network, catalogVersion: "mongodb-v1", legacy: false, bank: product.providerCode, name: product.displayName, type: product.network, owner: owner(body.owner), imageUrl: product.imageUrl ?? "/card-images/placeholder-card.svg", annualFee: product.annualFee, targetSpendForWaiver: product.targetSpendForWaiver ?? 0, annualFeeWaiverTarget: product.targetSpendForWaiver ?? null, monthlyData: months() });
      return reply.code(201).send(serialize(card));
    }
    if (typeof body.bank !== "string" || typeof body.name !== "string" || typeof body.type !== "string" || typeof body.imageUrl !== "string") throw new ApiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", { presetId: "presetId là bắt buộc cho catalog-first contract." });
    const card = await Cards.create({ userId: session.userId, workspaceId: session.workspaceId, bank: body.bank, name: body.name, type: body.type, owner: owner(body.owner), imageUrl: body.imageUrl, annualFee: optionalNumber(body.annualFee, "annualFee"), targetSpendForWaiver: typeof body.targetSpendForWaiver === "number" ? body.targetSpendForWaiver : 0, legacy: true, monthlyData: Array.isArray(body.monthlyData) ? body.monthlyData : months() });
    return reply.header("X-Deprecated-Contract", "legacy-card-create").code(201).send(serialize(card));
  });
  app.get("/api/cards/duplicates", async (request) => { const session = sessionFromRequest(request, secret); const cards = (await CreditCardModel.find({ workspaceId: session.workspaceId }).sort({ createdAt: 1 })).map((card) => plain(card)); const groups = new Map<string, Data[]>(); for (const card of cards) { const key = fingerprint(card); if (key) groups.set(key, [...(groups.get(key) ?? []), card]); } return { data: [...groups.entries()].filter(([, values]) => values.length > 1).map(([key, values]) => ({ fingerprint: key, workspaceId: session.workspaceId, presetId: values[0]?.presetId, normalizedOwner: String(values[0]?.owner ?? "").trim().replace(/\s+/g, " "), reason: "Same workspace, catalog preset and normalized owner.", cards: values.map(serialize) })) }; });
  app.post<{ Body: Data }>("/api/cards/duplicates", async (request) => { const session = sessionFromRequest(request, secret); const sourceId = request.body?.sourceCardId; const targetId = request.body?.targetCardId; if (typeof sourceId !== "string" || typeof targetId !== "string" || sourceId === targetId) throw new ApiError(400, "INVALID_MERGE_TARGET", "Không thể merge một thẻ vào chính nó."); const [sourceDoc, targetDoc] = await Promise.all([readable(sourceId, session.workspaceId), readable(targetId, session.workspaceId)]); const source = plain(sourceDoc); const target = plain(targetDoc); if (!fingerprint(source) || fingerprint(source) !== fingerprint(target)) throw new ApiError(409, "DUPLICATE_MISMATCH", "Hai thẻ không phải duplicate exact-match."); const updated = await CreditCardModel.findByIdAndUpdate(targetId, { $set: { monthlyData: mergeMonths(target.monthlyData, source.monthlyData) } }, { returnDocument: "after" }); await CreditCardModel.deleteOne({ _id: sourceId, workspaceId: session.workspaceId }); return { data: { targetCard: serialize(updated), deletedSourceId: sourceId, merge: { sourceCardId: sourceId, targetCardId: targetId, monthlyDataStrategy: "sum", reason: "Same workspace, catalog preset and normalized owner." } } }; });
  app.get<{ Params: { id: string } }>("/api/cards/:id", async (request) => serialize(await readable(request.params.id, sessionFromRequest(request, secret).workspaceId)));
  app.put<{ Params: { id: string }; Body: Data }>("/api/cards/:id", async (request) => {
    const session = sessionFromRequest(request, secret); await readable(request.params.id, session.workspaceId); const body = request.body ?? {}; const update: Data = {};
    if ("owner" in body) update.owner = owner(body.owner);
    if ("targetSpendForWaiver" in body) update.targetSpendForWaiver = optionalNumber(body.targetSpendForWaiver, "targetSpendForWaiver");
    if ("annualFeeWaiverTarget" in body) update.annualFeeWaiverTarget = optionalNumber(body.annualFeeWaiverTarget, "annualFeeWaiverTarget");
    if ("statementDay" in body) { const value = optionalNumber(body.statementDay, "statementDay"); if (!Number.isInteger(value) || value < 1 || value > 31) throw new ApiError(400, "INVALID_REQUEST", "Request body không hợp lệ."); update.statementDay = value; }
    if ("paymentDueDays" in body) { const value = optionalNumber(body.paymentDueDays, "paymentDueDays"); if (!Number.isInteger(value) || value < 1) throw new ApiError(400, "INVALID_REQUEST", "Request body không hợp lệ."); update.paymentDueDays = value; }
    if ("cashbackCapAmount" in body) update.cashbackCapAmount = body.cashbackCapAmount === null ? null : optionalNumber(body.cashbackCapAmount, "cashbackCapAmount");
    if ("cashbackCapPeriod" in body) { if (body.cashbackCapPeriod !== "STATEMENT" && body.cashbackCapPeriod !== "CALENDAR_MONTH") throw new ApiError(400, "INVALID_REQUEST", "Request body không hợp lệ."); update.cashbackCapPeriod = body.cashbackCapPeriod; }
    if ("active" in body) { if (typeof body.active !== "boolean") throw new ApiError(400, "INVALID_REQUEST", "Request body không hợp lệ."); update.active = body.active; }
    Object.assign(update, normalizeReminderPreferences(body));
    if (!Object.keys(update).length) throw new ApiError(400, "FORBIDDEN_UPDATE_FIELD", "Không có field hợp lệ để cập nhật.");
    return serialize(await CreditCardModel.findOneAndUpdate({ _id: request.params.id, workspaceId: session.workspaceId }, { $set: update }, { returnDocument: "after" }));
  });
  app.delete<{ Params: { id: string } }>("/api/cards/:id", async (request) => { const session = sessionFromRequest(request, secret); await readable(request.params.id, session.workspaceId); await CreditCardModel.deleteOne({ _id: request.params.id, workspaceId: session.workspaceId }); return { message: "Đã xóa thẻ thành công" }; });
};
