import type { FastifyInstance } from "fastify";
import type { AuthRepository } from "./auth-repository.js";
import { browserServiceContext } from "./context.js";
import { serializePaymentDueFeed } from "./calendar-subscription.js";
import { CardQueryService } from "./services/card-query-service.js";
import { CalendarSubscriptionService } from "./services/calendar-subscription-service.js";
import { StatementQueryService } from "./services/statement-query-service.js";
import { calendarSubscriptionCreateSchema, calendarSubscriptionListSchema } from "@card-credit/contracts";

export const registerCalendarSubscriptionRoutes = (app: FastifyInstance, users: AuthRepository, secret: string) => {
  app.get("/api/calendar-subscriptions", async (request) => ({ data: calendarSubscriptionListSchema.parse(await CalendarSubscriptionService.list(await browserServiceContext(request, secret, users))) }));
  app.post<{ Body: { deviceLabel?: unknown } }>("/api/calendar-subscriptions", async (request, reply) => {
    const context = await browserServiceContext(request, secret, users);
    return reply.code(201).send({ data: calendarSubscriptionCreateSchema.parse(await CalendarSubscriptionService.create(context, request.body?.deviceLabel)) });
  });
  app.delete<{ Params: { id: string } }>("/api/calendar-subscriptions/:id", async (request) => {
    return { data: await CalendarSubscriptionService.revoke(await browserServiceContext(request, secret, users), request.params.id) };
  });
  app.get<{ Params: { token: string } }>("/api/calendar-subscriptions/feed/:token.ics", { logLevel: "silent" }, async (request, reply) => {
    const context = await CalendarSubscriptionService.feedContext(request.params.token, users, request.id);
    if (!context) return reply.code(404).send("Not found");
    const cards = await CardQueryService.list(context, { userId: context.userId });
    const cardById = new Map(cards.map((card) => [card.id, card]));
    const statements = await StatementQueryService.listForCardIds(context, cards.map((card) => card.id), { unpaidOnly: true, order: "paymentDueDate" });
    const inputs = statements.flatMap((statement) => {
      const card = cardById.get(statement.cardId);
      if (!card) return [];
      return [{ identity: `${context.workspaceId}/${context.userId}/${statement.id}`, displayName: card.displayName ?? "Thẻ tín dụng", providerName: card.providerName ?? "Ngân hàng", owner: card.owner, periodStartDate: statement.periodStartDate, periodEndDate: statement.periodEndDate, statementDate: statement.statementDate, paymentDueDate: statement.paymentDueDate, totalAmountDue: statement.summary.outstandingAmount, effectivePaymentStatus: statement.effectivePaymentStatus, timezone: card.reminderTimezone ?? "Asia/Ho_Chi_Minh" }];
    });
    return reply.header("Content-Type", "text/calendar; charset=utf-8").header("Cache-Control", "private, no-store").header("Content-Disposition", 'inline; filename="card-credit-payment-due.ics"').send(serializePaymentDueFeed(inputs));
  });
};
