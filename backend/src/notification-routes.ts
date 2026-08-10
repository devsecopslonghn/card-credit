import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import { CardStatementModel } from "./models/card-statement.js";
import { CreditCardModel } from "./models/credit-card.js";

/** Read-only notification projection for the Stitch notifications screen. */
export const registerNotificationRoutes = (app: FastifyInstance, secret: string) => {
  app.get<{ Querystring: { limit?: string } }>("/api/notifications", async (request) => {
    const session = sessionFromRequest(request, secret);
    const limit = Math.min(Math.max(Number.parseInt(request.query.limit ?? "50", 10) || 50, 1), 100);
    const [statements, cards] = await Promise.all([
      CardStatementModel.find({ workspaceId: session.workspaceId }).sort({ paymentDueDate: 1 }).limit(limit).lean(),
      CreditCardModel.find({ workspaceId: session.workspaceId }).select("providerName displayName bank name").lean(),
    ]);
    const cardById = new Map(cards.map((card) => [String(card._id), card]));
    return {
      data: statements.map((statement) => {
        const card = cardById.get(String(statement.userCardId));
        const dueDate = String(statement.paymentDueDate ?? "");
        const status = statement.paymentStatus === "PAID" ? "success" : new Date(dueDate) < new Date() ? "alert" : "warning";
        return {
          id: String(statement._id),
          type: "payment_due",
          status,
          title: status === "success" ? "Đã ghi nhận thanh toán" : "Kỳ thanh toán cần theo dõi",
          message: `${card?.providerName ?? card?.bank ?? "Thẻ tín dụng"} · ${card?.displayName ?? card?.name ?? ""}`.trim(),
          dueDate,
          paymentStatus: statement.paymentStatus,
          cardId: String(statement.userCardId),
        };
      }),
      meta: { limit, source: "card_statements" },
    };
  });
};
