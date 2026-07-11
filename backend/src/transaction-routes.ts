import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { ApiError } from "./errors.js";
import { sessionFromRequest, type Session } from "./auth.js";
import { CreditCardModel } from "./models/credit-card.js";
import { CardTransactionModel } from "./models/card-transaction.js";
import { CardStatementModel } from "./models/card-statement.js";
import {
  derived,
  idOf,
  integer,
  plain,
  statementPeriod,
  summarize,
  transactionInput,
  validDate,
  type Data,
} from "./statement-domain.js";

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
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...value,
    _id: idOf(value._id),
    userCardId: idOf(value.userCardId),
    effectivePaymentStatus:
      value.paymentStatus !== "PAID" &&
      typeof value.paymentDueDate === "string" &&
      value.paymentDueDate < today
        ? "OVERDUE"
        : value.paymentStatus,
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
    return {
      data: await Promise.all(
        items.map(async (item) => {
          const value = plain(item);
          const [card, statement] = await Promise.all([
            Cards.findOne({
              _id: value.userCardId,
              workspaceId: session.workspaceId,
            }),
            Statements.findOne({
              _id: value.statementId,
              workspaceId: session.workspaceId,
            }),
          ]);
          return transactionJson(
            item,
            statement,
            card ? plain(card) : undefined,
          );
        }),
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
      return {
        data: await Promise.all(
          statements.map(async (statement) =>
            statementJson(
              statement,
              (
                await Transactions.find({
                  statementId: statement._id,
                  workspaceId: session.workspaceId,
                })
              ).map(plain),
              card,
            ),
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
};
