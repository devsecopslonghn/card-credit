import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { ApiError } from "./errors.js";
import { sessionFromRequest } from "./auth.js";
import { CreditCardModel } from "./models/credit-card.js";
import { browserServiceContext } from "./context.js";
import type { AuthRepository } from "./auth-repository.js";
import { CardQueryService } from "./services/card-query-service.js";
import { CardCommandService } from "./services/card-command-service.js";
import { MongoCatalogRepository } from "./mongo-catalog-repository.js";
import type { CatalogRepository } from "./catalog.js";
import { duplicateFingerprint } from "./card-duplicate.js";

type Data = Record<string, unknown>;
const Cards = CreditCardModel as unknown as mongoose.Model<Data>;
const plain = (value: unknown): Data => JSON.parse(JSON.stringify(value)) as Data;
const serialize = (value: unknown) => { const card = plain(value); return { ...card, providerName: card.providerName ?? card.bank, displayName: card.displayName ?? card.name, network: card.network ?? card.type, legacy: card.legacy ?? !card.presetId }; };
const validId = (id: string) => { if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ."); };
const readable = async (id: string, workspaceId: string) => { validId(id); const card = await Cards.findOne({ _id: id, workspaceId }); if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ."); return card; };
const fingerprint = duplicateFingerprint;
const mergeMonths = (target: unknown, source: unknown) => { const result = new Map<number, Data>(); for (const item of [...(Array.isArray(target) ? target : []), ...(Array.isArray(source) ? source : [])] as Data[]) { const month = Number(item.month); if (!Number.isInteger(month) || month < 1 || month > 12) continue; const current = result.get(month) ?? { month, spend: 0, cashback: 0, fee: 0, otherInterest: 0 }; for (const field of ["spend", "cashback", "fee", "otherInterest"]) current[field] = Number(current[field] ?? 0) + Number(item[field] ?? 0); result.set(month, current); } return [...result.values()].sort((a, b) => Number(a.month) - Number(b.month)); };
export const legacyCardResponse = (card: Awaited<ReturnType<typeof CardQueryService.get>>) => ({
  _id: card.id,
  presetId: card.presetId,
  providerCode: card.providerCode,
  providerName: card.providerName,
  displayName: card.displayName,
  network: card.network,
  legacy: card.legacy,
  bank: card.providerCode,
  name: card.displayName,
  type: card.network,
  owner: card.owner,
  imageUrl: card.imageUrl,
  annualFee: card.annualFee,
  targetSpendForWaiver: card.targetSpendForWaiver,
  annualFeeWaiverTarget: card.annualFeeWaiverTarget,
  statementDay: card.statementDay,
  paymentDueDays: card.paymentDueDays,
  cashbackCapAmount: card.cashbackCapAmount,
  cashbackCapPeriod: card.cashbackCapPeriod,
  active: card.active,
  reminderEnabled: card.reminderEnabled,
  reminderDaysBefore: card.reminderDaysBefore,
  reminderTimezone: card.reminderTimezone,
  reminderTime: card.reminderTime,
  statementDate: card.statementDate,
  paymentDueDate: card.paymentDueDate,
  amountDueThisMonth: card.amountDueThisMonth,
  isPaidThisMonth: card.isPaidThisMonth,
  monthlyData: card.monthlyData,
});

export const registerCardRoutes = (app: FastifyInstance, secret: string, users?: AuthRepository, catalog: CatalogRepository = new MongoCatalogRepository()) => {
  app.get("/api/cards", async (request) => (await CardQueryService.list(await browserServiceContext(request, secret, users))).map(legacyCardResponse));
  app.post<{ Body: Data }>("/api/cards", async (request, reply) => { const card = await CardCommandService.create(await browserServiceContext(request, secret, users), request.body ?? {}, catalog); const response = legacyCardResponse(card); const result = reply.code(201); if (card.legacy) result.header("X-Deprecated-Contract", "legacy-card-create"); return result.send(response); });
  app.get("/api/cards/duplicates", async (request) => {
    const groups = await CardQueryService.listDuplicates(await browserServiceContext(request, secret, users));
    return { data: groups.map((group) => ({ ...group, cards: group.cards.map(legacyCardResponse) })) };
  });
  app.post<{ Body: Data }>("/api/cards/duplicates", async (request) => { const session = sessionFromRequest(request, secret); const sourceId = request.body?.sourceCardId; const targetId = request.body?.targetCardId; if (typeof sourceId !== "string" || typeof targetId !== "string" || sourceId === targetId) throw new ApiError(400, "INVALID_MERGE_TARGET", "Không thể merge một thẻ vào chính nó."); const [sourceDoc, targetDoc] = await Promise.all([readable(sourceId, session.workspaceId), readable(targetId, session.workspaceId)]); const source = plain(sourceDoc); const target = plain(targetDoc); if (!fingerprint(source) || fingerprint(source) !== fingerprint(target)) throw new ApiError(409, "DUPLICATE_MISMATCH", "Hai thẻ không phải duplicate exact-match."); const updated = await CreditCardModel.findByIdAndUpdate(targetId, { $set: { monthlyData: mergeMonths(target.monthlyData, source.monthlyData) } }, { returnDocument: "after" }); await CreditCardModel.deleteOne({ _id: sourceId, workspaceId: session.workspaceId }); return { data: { targetCard: serialize(updated), deletedSourceId: sourceId, merge: { sourceCardId: sourceId, targetCardId: targetId, monthlyDataStrategy: "sum", reason: "Same workspace, catalog preset and normalized owner." } } }; });
  app.get<{ Params: { id: string } }>("/api/cards/:id", async (request) => legacyCardResponse(await CardQueryService.get(await browserServiceContext(request, secret, users), request.params.id)));
  app.put<{ Params: { id: string }; Body: Data }>("/api/cards/:id", async (request) => {
    return legacyCardResponse(await CardCommandService.update(await browserServiceContext(request, secret, users), request.params.id, request.body ?? {}));
  });
  app.delete<{ Params: { id: string } }>("/api/cards/:id", async (request) => { const session = sessionFromRequest(request, secret); await readable(request.params.id, session.workspaceId); await CreditCardModel.deleteOne({ _id: request.params.id, workspaceId: session.workspaceId }); return { message: "Đã xóa thẻ thành công" }; });
};
