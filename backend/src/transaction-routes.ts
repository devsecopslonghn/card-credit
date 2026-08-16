import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { ApiError } from "./errors.js";
import { sessionFromRequest, type Session } from "./auth.js";
import { browserServiceContext } from "./context.js";
import { CreditCardModel } from "./models/credit-card.js";
import { CardStatementModel } from "./models/card-statement.js";
import {
  effectivePaymentStatus,
  idOf,
  plain,
  summarize,
  type Data,
} from "./statement-domain.js";
import type { AuthRepository } from "./auth-repository.js";
import { MailDeliveryError, MailUnavailableError, maskEmail, type MailService } from "./mail-service.js";
import { composeStatementCalendarEmail } from "./statement-calendar-email.js";
import { projectStatementCalendar, serializeStatementCalendar } from "./statement-calendar.js";
import { TransactionService } from "./services/transaction-service.js";
import { FinancialTransactionModel } from "./models/financial-transaction.js";
import { FinancialTransactionService } from "./services/financial-transaction-service.js";
import { StatementQueryService } from "./services/statement-query-service.js";

const Cards = CreditCardModel as mongoose.Model<Data>;
const Statements = CardStatementModel;
const objectId = (value: string, field = "id") => {
  if (!mongoose.isValidObjectId(value))
    throw new ApiError(400, "INVALID_ID", "Id không hợp lệ.", {
      [field]: "ObjectId không hợp lệ.",
    });
};
const cardFor = async (id: string, session: Session) => {
  objectId(id, "cardId");
  const card = await Cards.findOne({
    _id: id,
    workspaceId: session.workspaceId,
  });
  if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
  return card;
};
const statementFor = async (
  cardId: string,
  statementId: string,
  session: Session,
) => {
  await cardFor(cardId, session);
  objectId(statementId, "statementId");
  const statement = await Statements.findOne({
    _id: statementId,
    userCardId: cardId,
    workspaceId: session.workspaceId,
  });
  if (!statement)
    throw new ApiError(404, "STATEMENT_NOT_FOUND", "Không tìm thấy kỳ sao kê.");
  return statement;
};
const financialView = (transaction: Data, card: Data): Data => ({
  ...transaction,
  _id: idOf(transaction._id),
  userCardId: idOf(card._id),
  statementId: idOf(transaction.statementId),
  transactionDate: transaction.transactionDate,
  outcomeAmount: Number(transaction.amount ?? 0),
  incomeAmount: Number(transaction.reimbursementExpected ?? 0),
  note: transaction.note ?? "",
  cashbackRateBps: Math.round(Number(transaction.serviceFeeRate ?? 0) * 100),
  actualCashbackAmount: Number(transaction.cashbackReceived ?? 0),
  cashbackStatus: Number(transaction.cashbackReceived ?? 0) > 0 ? "RECEIVED" : "PENDING",
});
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
  app.patch<{ Params: { id: string; statementId: string }; Body: Data }>(
    "/api/cards/:id/statements/:statementId/payment",
    async (request) => {
      const session = sessionFromRequest(request, secret);
      const card = plain(await cardFor(request.params.id, session));
      const statement = await statementFor(
        request.params.id,
        request.params.statementId,
        session,
      );
      const transactions = await FinancialTransactionModel.find({ statementId: request.params.statementId, workspaceId: session.workspaceId, transactionType: { $ne: "STATEMENT_PAYMENT" } });
      const action =
        request.body?.action === "REOPEN"
          ? "REOPEN"
          : request.body?.action === "CLOSED"
            ? "CLOSED"
            : "PAID";
      if (action === "CLOSED" && statement.paymentStatus === "PAID")
        throw new ApiError(
          409,
          "STATEMENT_PAID_LOCKED",
          "Kỳ sao kê đã thanh toán. Hãy mở lại kỳ sao kê trước.",
        );
      const update =
        action === "REOPEN"
          ? {
              paymentStatus: "STATEMENT_CLOSED",
              paidAt: null,
              paidAmount: null,
            }
          : action === "CLOSED"
            ? { paymentStatus: "STATEMENT_CLOSED" }
            : {
                paymentStatus: "PAID",
                paidAt: new Date(),
                paidAmount: transactions.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
              };
      if (action === "PAID") {
        const paidAmount = transactions.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
        const repaymentAccountId = typeof request.body?.repaymentAccountId === "string" && request.body.repaymentAccountId.trim()
          ? request.body.repaymentAccountId.trim()
          : process.env.FINANCE_DEFAULT_REPAYMENT_ACCOUNT_ID?.trim();
        if (paidAmount > 0 && !repaymentAccountId) throw new ApiError(400, "REPAYMENT_ACCOUNT_REQUIRED", "Cần chọn tài khoản DEBIT/CASH/E_WALLET dùng để trả sao kê.");
        const paidStatement = paidAmount > 0 && repaymentAccountId
          ? await FinancialTransactionService.payStatement(await browserServiceContext(request, secret, calendarEmail?.users), request.params.statementId, repaymentAccountId, paidAmount, new Date())
          : await Statements.findOneAndUpdate({ _id: request.params.statementId, workspaceId: session.workspaceId }, { $set: update }, { returnDocument: "after" });
        if (!paidStatement) throw new ApiError(404, "STATEMENT_NOT_FOUND", "Không tìm thấy kỳ sao kê.");
        return { data: TransactionService.serializeStatement(paidStatement, transactions.map((item) => financialView(item as Data, card)), card) };
      }
      const result = await Statements.findOneAndUpdate(
        { _id: request.params.statementId, workspaceId: session.workspaceId },
        { $set: update },
        { returnDocument: "after" },
      );
      return { data: TransactionService.serializeStatement(result, transactions.map((item) => financialView(item as Data, card)), card) };
    },
  );
  if (calendarEmail) app.post<{
    Params: { id: string; statementId: string };
    Body: Record<string, unknown>;
    Querystring: Record<string, string>;
  }>("/api/cards/:id/statements/:statementId/calendar-email", async (request) => {
    const session = sessionFromRequest(request, secret);
    const user = await calendarEmail.users.findUserById(session.userId);
    const recipient = user?.email.trim().toLowerCase() ?? "";
    const usableEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
    if (!user || !user.active || user.lockedAt || user.workspaceId !== session.workspaceId || !usableEmail)
      throw new ApiError(400, "ACCOUNT_EMAIL_UNAVAILABLE", "Email tài khoản không khả dụng.");

    const card = plain(await cardFor(request.params.id, session));
    const statement = plain(await statementFor(request.params.id, request.params.statementId, session));
    const transactions = (await FinancialTransactionModel.find({ statementId: request.params.statementId, workspaceId: session.workspaceId, transactionType: { $ne: "STATEMENT_PAYMENT" } })).map((item) => financialView(plain(item), card));
    const summary = summarize(transactions, card.cashbackCapAmount);
    const displayName = String(card.displayName ?? card.name ?? "Thẻ tín dụng");
    const projection = {
      identity: `${session.workspaceId}:${request.params.id}:${request.params.statementId}`,
      displayName,
      providerName: String(card.providerName ?? card.bank ?? ""),
      owner: String(card.owner ?? "Tôi"),
      periodStartDate: String(statement.periodStartDate),
      periodEndDate: String(statement.periodEndDate),
      statementDate: String(statement.statementDate),
      paymentDueDate: String(statement.paymentDueDate),
      totalAmountDue: summary.totalAmountDue,
      effectivePaymentStatus: effectivePaymentStatus(statement),
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
