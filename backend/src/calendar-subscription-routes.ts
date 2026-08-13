import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import type { AuthRepository } from "./auth-repository.js";
import { ApiError } from "./errors.js";
import { CalendarSubscriptionModel } from "./models/calendar-subscription.js";
import { CreditCardModel } from "./models/credit-card.js";
import { CardStatementModel } from "./models/card-statement.js";
import { FinancialTransactionModel } from "./models/financial-transaction.js";
import { createSubscriptionToken, hashSubscriptionToken, normalizeDeviceLabel, serializePaymentDueFeed, validSubscriptionToken } from "./calendar-subscription.js";
import { effectivePaymentStatus } from "./statement-domain.js";

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
    const cards = await CreditCardModel.find({ workspaceId: subscription.workspaceId, userId: subscription.userId }).lean();
    const cardById = new Map(cards.map((card) => [String(card._id), card as Data]));
    const statements = cardById.size ? await CardStatementModel.find({ workspaceId: subscription.workspaceId, userCardId: { $in: [...cardById.keys()] }, paymentStatus: { $ne: "PAID" } }).sort({ paymentDueDate: 1 }).lean() : [];
    const statementIds = statements.map((statement) => statement._id);
    const totals = statementIds.length ? await FinancialTransactionModel.aggregate([
      { $match: { workspaceId: subscription.workspaceId, statementId: { $in: statementIds }, transactionType: { $ne: "STATEMENT_PAYMENT" } } },
      { $group: { _id: "$statementId", amount: { $sum: "$amount" } } },
    ]) : [];
    const amountByStatement = new Map(totals.map((total) => [String(total._id), Number(total.amount ?? 0)]));
    const inputs = statements.map((statement) => { const item = statement as Data; const card = cardById.get(String(item.userCardId))!; return { identity: `${subscription.workspaceId}/${subscription.userId}/${String(item._id)}`, displayName: String(card.displayName ?? card.name ?? "Thẻ tín dụng"), providerName: String(card.providerName ?? card.bank ?? "Ngân hàng"), owner: String(card.owner ?? "Tôi"), periodStartDate: String(item.periodStartDate), periodEndDate: String(item.periodEndDate), statementDate: String(item.statementDate), paymentDueDate: String(item.paymentDueDate), totalAmountDue: amountByStatement.get(String(item._id)) ?? 0, effectivePaymentStatus: effectivePaymentStatus(item), timezone: String(card.reminderTimezone ?? "Asia/Ho_Chi_Minh") }; });
    void CalendarSubscriptionModel.updateOne({ _id: subscription._id }, { $set: { lastAccessedAt: new Date() } }).catch(() => {});
    return reply.header("Content-Type", "text/calendar; charset=utf-8").header("Cache-Control", "private, no-store").header("Content-Disposition", 'inline; filename="card-credit-payment-due.ics"').send(serializePaymentDueFeed(inputs));
  });
};
