import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { ApiError } from "./errors.js";
import { sessionFromRequest, type Session } from "./auth.js";
import { CreditCardModel } from "./models/credit-card.js";
import { CardTransactionModel } from "./models/card-transaction.js";
import { CardStatementModel } from "./models/card-statement.js";
import {
  derived,
  effectivePaymentStatus,
  idOf,
  integer,
  plain,
  statementPeriod,
  summarize,
  transactionInput,
  validDate,
  type Data,
} from "./statement-domain.js";
import type { AuthRepository } from "./auth-repository.js";
import { MailDeliveryError, MailUnavailableError, maskEmail, type MailService } from "./mail-service.js";
import { composeStatementCalendarEmail } from "./statement-calendar-email.js";
import { projectStatementCalendar, serializeStatementCalendar } from "./statement-calendar.js";

const Cards = CreditCardModel as mongoose.Model<Data>;
const Transactions = CardTransactionModel;
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
const editable = (statement: Data | null) => {
  if (statement?.paymentStatus === "PAID")
    throw new ApiError(
      409,
      "STATEMENT_PAID_LOCKED",
      "Kỳ sao kê đã thanh toán. Hãy mở lại kỳ sao kê trước khi chỉnh sửa giao dịch.",
    );
};
const getOrCreateStatement = async (
  card: Data,
  transactionDate: string,
  session: Session,
) => {
  const period = statementPeriod(
    transactionDate,
    Number(card.statementDay ?? 1),
    Number(card.paymentDueDays ?? 15),
  );
  return Statements.findOneAndUpdate(
    {
      workspaceId: session.workspaceId,
      userCardId: card._id,
      statementDate: period.statementDate,
    },
    {
      $setOnInsert: {
        userId: session.userId,
        workspaceId: session.workspaceId,
        userCardId: card._id,
        ...period,
        paymentStatus: "OPEN",
        paidAt: null,
        paidAmount: null,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
};
const statementJson = (
  statement: unknown,
  transactions: Data[],
  card: Data,
) => {
  const value = plain(statement);
  const summary = summarize(transactions, card.cashbackCapAmount);
  return {
    ...value,
    _id: idOf(value._id),
    userCardId: idOf(value.userCardId),
    effectivePaymentStatus: effectivePaymentStatus(value),
    summary,
    cashbackCapAmount: card.cashbackCapAmount ?? null,
    cashbackCapPeriod: card.cashbackCapPeriod ?? "STATEMENT",
  };
};
const transactionJson = (
  transaction: unknown,
  statement?: unknown,
  card?: Data,
) => {
  const value = plain(transaction);
  return {
    ...value,
    _id: idOf(value._id),
    userCardId: idOf(value.userCardId),
    statementId: idOf(value.statementId),
    derived: derived(value),
    statement:
      statement && card ? statementJson(statement, [], card) : undefined,
    card: card
      ? {
          _id: idOf(card._id),
          providerName: card.providerName ?? card.bank,
          displayName: card.displayName ?? card.name,
          network: card.network ?? card.type,
          owner: card.owner ?? "Tôi",
        }
      : undefined,
  };
};
const groupTransactionsByStatement = (transactions: Data[]) => {
  const grouped = new Map<string, Data[]>();
  for (const transaction of transactions) {
    const statementId = idOf(transaction.statementId);
    const items = grouped.get(statementId);
    if (items) items.push(transaction);
    else grouped.set(statementId, [transaction]);
  }
  return grouped;
};
const transactionFor = async (id: string, session: Session) => {
  objectId(id, "transactionId");
  const item = await Transactions.findOne({
    _id: id,
    workspaceId: session.workspaceId,
  });
  if (!item)
    throw new ApiError(
      404,
      "TRANSACTION_NOT_FOUND",
      "Không tìm thấy giao dịch.",
    );
  return item;
};

export const registerTransactionRoutes = (
  app: FastifyInstance,
  secret: string,
  calendarEmail?: { users: AuthRepository; mail: MailService },
) => {
  app.get<{
    Querystring: {
      date?: string;
      cardId?: string;
      userCardId?: string;
      statementId?: string;
    };
  }>("/api/card-transactions", async (request) => {
    const session = sessionFromRequest(request, secret);
    const query: Data = { workspaceId: session.workspaceId };
    const cardId = request.query.cardId ?? request.query.userCardId;
    if (request.query.date) {
      if (!validDate(request.query.date))
        throw new ApiError(400, "INVALID_DATE", "Ngày không hợp lệ.");
      query.transactionDate = request.query.date;
    }
    if (cardId) {
      objectId(cardId, "cardId");
      query.userCardId = cardId;
    }
    if (request.query.statementId) {
      objectId(request.query.statementId, "statementId");
      query.statementId = request.query.statementId;
    }
    const items = await Transactions.find(query).sort({
      transactionDate: -1,
      createdAt: -1,
    });
    const values = items.map(plain);
    const cardIds = [...new Set(values.map((item) => idOf(item.userCardId)).filter(Boolean))];
    const statementIds = [
      ...new Set(values.map((item) => idOf(item.statementId)).filter(Boolean)),
    ];
    const [cards, statements] = await Promise.all([
      cardIds.length
        ? Cards.find({
            _id: { $in: cardIds },
            workspaceId: session.workspaceId,
          })
        : [],
      statementIds.length
        ? Statements.find({
            _id: { $in: statementIds },
            workspaceId: session.workspaceId,
          })
        : [],
    ]);
    const cardById = new Map(cards.map((card) => [idOf(card._id), plain(card)]));
    const statementById = new Map(
      statements.map((statement) => [idOf(statement._id), statement]),
    );
    return {
      data: items.map((item, index) =>
        transactionJson(
          item,
          statementById.get(idOf(values[index]?.statementId)),
          cardById.get(idOf(values[index]?.userCardId)),
        ),
      ),
    };
  });
  app.post<{ Body: Data }>("/api/card-transactions", async (request, reply) => {
    const session = sessionFromRequest(request, secret);
    const requestedCard = request.body?.userCardId ?? request.body?.cardId;
    if (typeof requestedCard !== "string")
      throw new ApiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
        cardId: "cardId là bắt buộc.",
      });
    const cardDoc = await cardFor(requestedCard, session);
    const card = plain(cardDoc);
    const input = transactionInput(request.body ?? {});
    const statement = await getOrCreateStatement(
      card,
      input.transactionDate,
      session,
    );
    editable(statement ? plain(statement) : null);
    const item = await Transactions.create({
      userId: session.userId,
      workspaceId: session.workspaceId,
      userCardId: card._id,
      statementId: statement?._id,
      ...input,
      cashbackStatus: "PENDING",
      actualCashbackAmount: null,
    });
    return reply
      .code(201)
      .send({
        data: transactionJson(item, statement, card),
        requiresClosedStatementConfirmation:
          statement?.paymentStatus === "STATEMENT_CLOSED",
      });
  });
  app.patch<{ Params: { id: string }; Body: Data }>(
    "/api/card-transactions/:id",
    async (request) => {
      const session = sessionFromRequest(request, secret);
      const currentDoc = await transactionFor(request.params.id, session);
      const current = plain(currentDoc);
      const oldStatement = await Statements.findOne({
        _id: current.statementId,
        workspaceId: session.workspaceId,
      });
      editable(oldStatement ? plain(oldStatement) : null);
      const cardId = idOf(
        request.body?.userCardId ?? request.body?.cardId ?? current.userCardId,
      );
      const cardDoc = await cardFor(cardId, session);
      const card = plain(cardDoc);
      const input = transactionInput(request.body ?? {}, current);
      const statement = await getOrCreateStatement(
        card,
        input.transactionDate,
        session,
      );
      editable(statement ? plain(statement) : null);
      const item = await Transactions.findOneAndUpdate(
        { _id: request.params.id, workspaceId: session.workspaceId },
        {
          $set: { userCardId: card._id, statementId: statement?._id, ...input },
        },
        { returnDocument: "after" },
      );
      return {
        data: transactionJson(item, statement, card),
        requiresClosedStatementConfirmation:
          oldStatement?.paymentStatus === "STATEMENT_CLOSED" ||
          statement?.paymentStatus === "STATEMENT_CLOSED",
      };
    },
  );
  app.delete<{ Params: { id: string } }>(
    "/api/card-transactions/:id",
    async (request) => {
      const session = sessionFromRequest(request, secret);
      const item = await transactionFor(request.params.id, session);
      const statement = await Statements.findOne({
        _id: item.statementId,
        workspaceId: session.workspaceId,
      });
      editable(statement ? plain(statement) : null);
      await Transactions.deleteOne({
        _id: request.params.id,
        workspaceId: session.workspaceId,
      });
      return {
        data: {
          deletedId: request.params.id,
          requiresClosedStatementConfirmation:
            statement?.paymentStatus === "STATEMENT_CLOSED",
        },
      };
    },
  );
  app.patch<{ Params: { id: string }; Body: Data }>(
    "/api/card-transactions/:id/cashback",
    async (request) => {
      const session = sessionFromRequest(request, secret);
      const current = await transactionFor(request.params.id, session);
      const statement = await Statements.findOne({
        _id: current.statementId,
        workspaceId: session.workspaceId,
      });
      editable(statement ? plain(statement) : null);
      const status = request.body?.cashbackStatus;
      if (
        status !== "PENDING" &&
        status !== "RECEIVED" &&
        status !== "REJECTED"
      )
        throw new ApiError(
          400,
          "INVALID_CASHBACK_STATUS",
          "Trạng thái cashback không hợp lệ.",
        );
      const actual =
        status === "RECEIVED"
          ? integer(
              request.body?.actualCashbackAmount,
              "actualCashbackAmount",
              0,
            )
          : null;
      const item = await Transactions.findOneAndUpdate(
        { _id: request.params.id, workspaceId: session.workspaceId },
        { $set: { cashbackStatus: status, actualCashbackAmount: actual } },
        { returnDocument: "after" },
      );
      const card = await Cards.findOne({
        _id: item?.userCardId,
        workspaceId: session.workspaceId,
      });
      return {
        data: transactionJson(item, statement, card ? plain(card) : undefined),
        requiresClosedStatementConfirmation:
          statement?.paymentStatus === "STATEMENT_CLOSED",
      };
    },
  );
  app.get("/api/card-statements", async (request) => {
    const session = sessionFromRequest(request, secret);
    const cards = await Cards.find({ workspaceId: session.workspaceId }).sort({
      createdAt: -1,
    });
    const cardIds = cards.map((card) => idOf(card._id));
    const statements = cardIds.length
      ? await Statements.find({
          userCardId: { $in: cardIds },
          workspaceId: session.workspaceId,
        }).sort({ statementDate: -1 })
      : [];
    const statementIds = statements.map((statement) => idOf(statement._id));
    const transactions = statementIds.length
      ? (
          await Transactions.find({
            statementId: { $in: statementIds },
            workspaceId: session.workspaceId,
          })
        ).map(plain)
      : [];
    const cardById = new Map(cards.map((card) => [idOf(card._id), plain(card)]));
    const transactionsByStatement = groupTransactionsByStatement(transactions);
    const statementsByCard = new Map<string, typeof statements>();
    for (const statement of statements) {
      const cardId = idOf(statement.userCardId);
      const cardStatements = statementsByCard.get(cardId);
      if (cardStatements) cardStatements.push(statement);
      else statementsByCard.set(cardId, [statement]);
    }
    return {
      data: cardIds.flatMap((cardId) => {
        const card = cardById.get(cardId)!;
        return (statementsByCard.get(cardId) ?? []).map((statement) => {
          const statementTransactions =
            transactionsByStatement.get(idOf(statement._id)) ?? [];
          return {
            ...statementJson(
              statement,
              statementTransactions,
              card,
            ),
            transactions: statementTransactions.map((transaction) =>
              transactionJson(transaction),
            ),
          };
        });
      }),
    };
  });
  app.get<{ Params: { id: string } }>(
    "/api/cards/:id/statements",
    async (request) => {
      const session = sessionFromRequest(request, secret);
      const cardDoc = await cardFor(request.params.id, session);
      const card = plain(cardDoc);
      const statements = await Statements.find({
        userCardId: request.params.id,
        workspaceId: session.workspaceId,
      }).sort({ statementDate: -1 });
      const statementIds = statements.map((statement) => idOf(statement._id));
      const transactions = statementIds.length
        ? (
            await Transactions.find({
              statementId: { $in: statementIds },
              workspaceId: session.workspaceId,
            })
          ).map(plain)
        : [];
      const transactionsByStatement = groupTransactionsByStatement(transactions);
      return {
        data: statements.map((statement) =>
          statementJson(
            statement,
            transactionsByStatement.get(idOf(statement._id)) ?? [],
            card,
          ),
        ),
      };
    },
  );
  app.get<{ Params: { id: string; statementId: string } }>(
    "/api/cards/:id/statements/:statementId",
    async (request) => {
      const session = sessionFromRequest(request, secret);
      const card = plain(await cardFor(request.params.id, session));
      const statement = await statementFor(
        request.params.id,
        request.params.statementId,
        session,
      );
      const transactions = await Transactions.find({
        statementId: request.params.statementId,
        workspaceId: session.workspaceId,
      }).sort({ transactionDate: -1, createdAt: -1 });
      return {
        data: {
          ...statementJson(statement, transactions.map(plain), card),
          transactions: transactions.map((item) =>
            transactionJson(item, statement, card),
          ),
        },
      };
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
      const transactions = await Transactions.find({
        statementId: request.params.statementId,
        workspaceId: session.workspaceId,
      });
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
                paidAmount: summarize(
                  transactions.map(plain),
                  card.cashbackCapAmount,
                ).totalAmountDue,
              };
      const result = await Statements.findOneAndUpdate(
        { _id: request.params.statementId, workspaceId: session.workspaceId },
        { $set: update },
        { returnDocument: "after" },
      );
      return { data: statementJson(result, transactions.map(plain), card) };
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
    const transactions = (await Transactions.find({
      statementId: request.params.statementId,
      workspaceId: session.workspaceId,
    })).map(plain);
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
