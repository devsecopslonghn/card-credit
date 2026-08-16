import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import type { AuthRepository } from "./auth-repository.js";
import { jobServiceContext } from "./context.js";
import { ApiError } from "./errors.js";
import { CalendarSubscriptionModel } from "./models/calendar-subscription.js";
import { createSubscriptionToken, hashSubscriptionToken, normalizeDeviceLabel, serializePaymentDueFeed, validSubscriptionToken } from "./calendar-subscription.js";
import { CardQueryService } from "./services/card-query-service.js";
import { StatementQueryService } from "./services/statement-query-service.js";

type Data = Record<string, unknown>;
const safe = (doc: Data) => ({ id: String(doc._id), deviceLabel: doc.deviceLabel ?? null, createdAt: doc.createdAt, lastAccessedAt: doc.lastAccessedAt ?? null, revokedAt: doc.revokedAt ?? null });
const label = (value: unknown) => { try { return normalizeDeviceLabel(value); } catch { throw new ApiError(400, "INVALID_DEVICE_LABEL", "Nhãn thiết bị không hợp lệ.", { deviceLabel: "Nhãn tối đa 80 ký tự." }); } };

export const registerCalendarSubscriptionRoutes = (app: FastifyInstance, users: AuthRepository, secret: string) => {
  app.get("/api/calendar-subscriptions", async (request) => {
    const session = sessionFromRequest(request, secret);
    const docs = await CalendarSubscriptionModel.find({ userId: session.userId, workspaceId: session.workspaceId }).sort({ createdAt: -1 }).lean();
    return { data: docs.map((doc) => safe(doc as Data)) };
  });
  app.post<{ Body: { deviceLabel?: unknown } }>("/api/calendar-subscriptions", async (request, reply) => {
    const session = sessionFromRequest(request, secret); const user = await users.findUserById(session.userId);
    if (!user || !user.active || user.lockedAt || user.workspaceId !== session.workspaceId) throw new ApiError(403, "ACCOUNT_UNAVAILABLE", "Tài khoản không thể tạo lịch đăng ký.");
    const token = createSubscriptionToken();
    const doc = await CalendarSubscriptionModel.create({ userId: session.userId, workspaceId: session.workspaceId, deviceLabel: label(request.body?.deviceLabel), tokenHash: hashSubscriptionToken(token) });
    return reply.code(201).send({ data: { ...safe(doc.toObject() as Data), subscriptionPath: `/api/calendar-subscriptions/feed/${token}.ics` } });
  });
  app.delete<{ Params: { id: string } }>("/api/calendar-subscriptions/:id", async (request) => {
    const session = sessionFromRequest(request, secret);
    if (!mongoose.isValidObjectId(request.params.id)) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Không tìm thấy lịch đăng ký.");
    const result = await CalendarSubscriptionModel.updateOne({ _id: request.params.id, userId: session.userId, workspaceId: session.workspaceId, revokedAt: null }, { $set: { revokedAt: new Date() } });
    if (!result.modifiedCount) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Không tìm thấy lịch đăng ký.");
    return { data: { revoked: true } };
  });
  app.get<{ Params: { token: string } }>("/api/calendar-subscriptions/feed/:token.ics", { logLevel: "silent" }, async (request, reply) => {
    const token = request.params.token; if (!validSubscriptionToken(token)) return reply.code(404).send("Not found");
    const subscription = await CalendarSubscriptionModel.findOne({ tokenHash: hashSubscriptionToken(token), revokedAt: null }).select("+tokenHash").lean() as Data | null;
    if (!subscription) return reply.code(404).send("Not found");
    const user = await users.findUserById(String(subscription.userId));
    if (!user || !user.active || user.lockedAt || user.workspaceId !== subscription.workspaceId) return reply.code(404).send("Not found");
    const context = jobServiceContext({ userId: user.id, workspaceId: user.workspaceId, role: user.role }, request.id);
    const cards = await CardQueryService.list(context, { userId: context.userId });
    const cardById = new Map(cards.map((card) => [card.id, card]));
    const statements = await StatementQueryService.listForCardIds(context, cards.map((card) => card.id), { unpaidOnly: true, order: "paymentDueDate" });
    const inputs = statements.flatMap((statement) => {
      const card = cardById.get(statement.cardId);
      if (!card) return [];
      return [{ identity: `${context.workspaceId}/${context.userId}/${statement.id}`, displayName: card.displayName ?? "Thẻ tín dụng", providerName: card.providerName ?? "Ngân hàng", owner: card.owner, periodStartDate: statement.periodStartDate, periodEndDate: statement.periodEndDate, statementDate: statement.statementDate, paymentDueDate: statement.paymentDueDate, totalAmountDue: statement.summary.outstandingAmount, effectivePaymentStatus: statement.effectivePaymentStatus, timezone: card.reminderTimezone ?? "Asia/Ho_Chi_Minh" }];
    });
    void CalendarSubscriptionModel.updateOne({ _id: subscription._id }, { $set: { lastAccessedAt: new Date() } }).catch(() => {});
    return reply.header("Content-Type", "text/calendar; charset=utf-8").header("Cache-Control", "private, no-store").header("Content-Disposition", 'inline; filename="card-credit-payment-due.ics"').send(serializePaymentDueFeed(inputs));
  });
};
