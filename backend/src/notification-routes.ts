import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import type { AuthRepository } from "./auth-repository.js";
import { CardQueryService } from "./services/card-query-service.js";
import { StatementQueryService } from "./services/statement-query-service.js";

/** Read-only notification projection for the Stitch notifications screen. */
export const registerNotificationRoutes = (app: FastifyInstance, secret: string, users?: Pick<AuthRepository, "findUserById">) => {
  app.get<{ Querystring: { limit?: string } }>("/api/notifications", async (request) => {
    const context = await browserServiceContext(request, secret, users);
    const limit = Math.min(Math.max(Number.parseInt(request.query.limit ?? "50", 10) || 50, 1), 100);
    const [statements, cards] = await Promise.all([
      StatementQueryService.listNotifications(context, limit),
      CardQueryService.list(context),
    ]);
    const cardById = new Map(cards.map((card) => [card.id, card]));
    return {
      data: statements.map((statement) => {
        const card = cardById.get(statement.cardId);
        const status = statement.effectivePaymentStatus === "PAID" ? "success" : statement.effectivePaymentStatus === "OVERDUE" ? "alert" : "warning";
        const providerName = card?.providerName ?? "Thẻ tín dụng";
        const displayName = card?.displayName ?? "";
        return {
          id: statement.id,
          type: "payment_due",
          status,
          title: status === "success" ? "Đã ghi nhận thanh toán" : "Kỳ thanh toán cần theo dõi",
          message: `${providerName}${displayName ? ` · ${displayName}` : ""}`.trim(),
          dueDate: statement.paymentDueDate,
          paymentStatus: statement.paymentStatus,
          cardId: statement.cardId,
        };
      }),
      meta: { limit, source: "card_statements" },
    };
  });
};
