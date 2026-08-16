import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import type { AuthRepository } from "./auth-repository.js";
import { browserServiceContext, jobServiceContext } from "./context.js";
import { CalendarSubscriptionModel } from "./models/calendar-subscription.js";
import { hashSubscriptionToken, serializePaymentDueFeed, validSubscriptionToken } from "./calendar-subscription.js";
import { CardQueryService } from "./services/card-query-service.js";
import { CalendarSubscriptionService, safeCalendarSubscription } from "./services/calendar-subscription-service.js";
import { StatementQueryService } from "./services/statement-query-service.js";

type Data = Record<string, unknown>;

export const registerCalendarSubscriptionRoutes = (app: FastifyInstance, users: AuthRepository, secret: string) => {
  app.get("/api/calendar-subscriptions", async (request) => {
    const session = sessionFromRequest(request, secret);
    const docs = await CalendarSubscriptionModel.find({ userId: session.userId, workspaceId: session.workspaceId }).sort({ createdAt: -1 }).lean();
    return { data: docs.map((doc) => safeCalendarSubscription(doc as Data)) };
  });
  app.post<{ Body: { deviceLabel?: unknown } }>("/api/calendar-subscriptions", async (request, reply) => {
    const context = await browserServiceContext(request, secret, users);
    return reply.code(201).send({ data: await CalendarSubscriptionService.create(context, request.body?.deviceLabel) });
  });
  app.delete<{ Params: { id: string } }>("/api/calendar-subscriptions/:id", async (request) => {
    return { data: await CalendarSubscriptionService.revoke(await browserServiceContext(request, secret, users), request.params.id) };
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
