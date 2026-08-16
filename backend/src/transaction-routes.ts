import type { FastifyInstance } from "fastify";
import { ApiError } from "./errors.js";
import { browserActorContext, browserServiceContext } from "./context.js";
import type { AuthRepository } from "./auth-repository.js";
import { MailDeliveryError, MailUnavailableError, maskEmail, type MailService } from "./mail-service.js";
import { composeStatementCalendarEmail } from "./statement-calendar-email.js";
import { projectStatementCalendar, serializeStatementCalendar } from "./statement-calendar.js";
import { StatementQueryService } from "./services/statement-query-service.js";
import { StatementPaymentCommandService } from "./services/statement-payment-command-service.js";
import { CardQueryService } from "./services/card-query-service.js";
import { statementPaymentInputSchema, type StatementPaymentInput } from "@card-credit/contracts";

export const registerTransactionRoutes = (
  app: FastifyInstance,
  secret: string,
  calendarEmail?: { users: AuthRepository; mail: MailService },
) => {
  app.get("/api/card-statements", async (request) => {
    return { data: await StatementQueryService.list(await browserServiceContext(request, secret, calendarEmail?.users)) };
  });
  app.get<{ Params: { id: string } }>(
    "/api/cards/:id/statements",
    async (request) => {
      return { data: await StatementQueryService.list(await browserServiceContext(request, secret, calendarEmail?.users), { cardId: request.params.id }) };
    },
  );
  app.get<{ Params: { id: string; statementId: string } }>(
    "/api/cards/:id/statements/:statementId",
    async (request) => {
      return { data: await StatementQueryService.get(await browserServiceContext(request, secret, calendarEmail?.users), request.params.id, request.params.statementId) };
    },
  );
  app.post<{ Params: { id: string; statementId: string }; Body: Record<string, unknown> }>(
    "/api/cards/:id/statements/:statementId/payment/preview",
    async (request) => {
      const parsed = statementPaymentInputSchema.safeParse(request.body);
      if (!parsed.success) throw new ApiError(400, "INVALID_PAYMENT_ACTION", "Thao tác thanh toán không hợp lệ.");
      const context = await browserServiceContext(request, secret, calendarEmail?.users);
      return { data: await StatementPaymentCommandService.preview(context, request.params.id, request.params.statementId, parsed.data as StatementPaymentInput) };
    },
  );
  app.patch<{ Params: { id: string; statementId: string }; Body: Record<string, unknown> }>(
    "/api/cards/:id/statements/:statementId/payment",
    async (request) => {
      const parsed = statementPaymentInputSchema.safeParse(request.body);
      if (!parsed.success) throw new ApiError(400, "INVALID_PAYMENT_ACTION", "Thao tác thanh toán không hợp lệ.");
      const rawIdempotencyKey = request.headers["idempotency-key"];
      if (typeof rawIdempotencyKey !== "string" || rawIdempotencyKey.trim().length < 8) throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Thanh toán sao kê cần Idempotency-Key tối thiểu 8 ký tự.");
      const context = await browserServiceContext(request, secret, calendarEmail?.users);
      await StatementPaymentCommandService.execute(
        context,
        request.params.id,
        request.params.statementId,
        parsed.data as StatementPaymentInput,
        { idempotencyKey: rawIdempotencyKey.trim(), endpointOrTool: "PATCH /api/cards/:id/statements/:statementId/payment" },
        new Date(),
      );
      return { data: await StatementQueryService.get(context, request.params.id, request.params.statementId) };
    },
  );
  if (calendarEmail) app.post<{
    Params: { id: string; statementId: string };
    Body: Record<string, unknown>;
    Querystring: Record<string, string>;
  }>("/api/cards/:id/statements/:statementId/calendar-email", async (request) => {
    const { context, actor } = await browserActorContext(request, secret, calendarEmail.users);
    const recipient = actor.email.trim().toLowerCase();
    const usableEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
    if (!usableEmail) throw new ApiError(400, "ACCOUNT_EMAIL_UNAVAILABLE", "Email tài khoản không khả dụng.");
    const card = await CardQueryService.get(context, request.params.id);
    const statement = await StatementQueryService.get(context, request.params.id, request.params.statementId);
    const displayName = card.displayName ?? "Thẻ tín dụng";
    const projection = {
      identity: `${context.workspaceId}:${request.params.id}:${request.params.statementId}`,
      displayName,
      providerName: card.providerName ?? "",
      owner: card.owner,
      periodStartDate: statement.periodStartDate,
      periodEndDate: statement.periodEndDate,
      statementDate: statement.statementDate,
      paymentDueDate: statement.paymentDueDate,
      totalAmountDue: statement.summary.outstandingAmount,
      effectivePaymentStatus: statement.effectivePaymentStatus,
    };
    const maskedRecipient = maskEmail(recipient);
    request.log.info({ event: "STATEMENT_CALENDAR_EMAIL_STARTED", recipient: maskedRecipient });
    try {
      const calendarContent = serializeStatementCalendar(projectStatementCalendar(projection));
      await calendarEmail.mail.sendStatementCalendarEmail(composeStatementCalendarEmail({ ...projection, recipient, calendarContent }));
      request.log.info({ event: "STATEMENT_CALENDAR_EMAIL_SUCCEEDED", recipient: maskedRecipient });
      return { data: { sent: true as const, recipient: maskedRecipient } };
    } catch (error) {
      request.log.warn({ event: "STATEMENT_CALENDAR_EMAIL_FAILED", recipient: maskedRecipient });
      if (error instanceof MailUnavailableError)
        throw new ApiError(503, "MAIL_UNAVAILABLE", "Tính năng gửi lịch hiện chưa khả dụng.");
      if (error instanceof MailDeliveryError)
        throw new ApiError(502, "MAIL_DELIVERY_FAILED", "Không thể gửi file lịch. Vui lòng thử lại sau.");
      throw error;
    }
  });
};
