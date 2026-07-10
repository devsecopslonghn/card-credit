import mongoose from "mongoose";
import { ApiError } from "../api/errorsCore.mjs";
import {
  CASHBACK_STATUSES,
  INCOME_INPUT_MODES,
  PAYMENT_STATUSES,
  buildStatementPeriod,
  calculateTransactionDerived,
  deriveIncomeFromRate,
  deriveRateFromIncome,
  getEffectivePaymentStatus,
  isDateOnlyString,
  summarizeTransactions,
} from "../cards/statementCore.mjs";

const MAX_NOTE_LENGTH = 1000;

const ownershipFields = (session) => ({
  userId: session?.userId ?? null,
  workspaceId: session?.workspaceId ?? "default",
});

const workspaceQuery = (session, extra = {}) => (session ? { ...extra, workspaceId: session.workspaceId } : extra);

const toId = (value) => (value && typeof value.toString === "function" ? value.toString() : String(value ?? ""));

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const apiError = (status, code, message, fields) => new ApiError(status, code, message, fields);

const assertObjectId = (id, field = "id") => {
  if (!mongoose.isValidObjectId(id)) {
    throw apiError(400, "INVALID_ID", "Id không hợp lệ.", { [field]: "ObjectId không hợp lệ." });
  }
};

const asString = (value, field, { required = false, maxLength = null } = {}) => {
  if (value === undefined || value === null) {
    if (required) throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", { [field]: `${field} là bắt buộc.` });
    return "";
  }
  if (typeof value !== "string") {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", { [field]: `${field} phải là chuỗi.` });
  }
  const text = value.trim();
  if (required && !text) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", { [field]: `${field} là bắt buộc.` });
  }
  if (maxLength && text.length > maxLength) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", { [field]: `${field} quá dài.` });
  }
  return text;
};

const asInteger = (value, field, { min = null, max = null, required = true } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (!required) return null;
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", { [field]: `${field} là bắt buộc.` });
  }
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", { [field]: `${field} phải là số nguyên.` });
  }
  if (min !== null && number < min) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", { [field]: `${field} phải >= ${min}.` });
  }
  if (max !== null && number > max) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", { [field]: `${field} phải <= ${max}.` });
  }
  return number;
};

const asBoolean = (value, field, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  if (typeof value !== "boolean") {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", { [field]: `${field} phải là boolean.` });
  }
  return value;
};

const assertDateOnly = (value, field) => {
  const date = asString(value, field, { required: true });
  if (!isDateOnlyString(date)) {
    throw apiError(400, "INVALID_DATE", "Ngày không hợp lệ.", { [field]: "Ngày phải theo định dạng YYYY-MM-DD." });
  }
  return date;
};

const getCardConfig = (card) => ({
  statementDay: Number(card.statementDay ?? 1),
  paymentDueDays: Number(card.paymentDueDays ?? 15),
});

const assertOwnedCard = async (cardId, { CardModel, session }) => {
  assertObjectId(cardId, "cardId");
  const card = await CardModel.findById(cardId);
  if (!card || (session && card.workspaceId !== session.workspaceId)) {
    throw apiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
  }
  return card;
};

const serializeStatement = (statement, transactions = []) => {
  const plain = statement?.toObject?.() ?? { ...statement };
  const summary = summarizeTransactions(transactions);
  return {
    ...plain,
    _id: toId(plain._id),
    userCardId: toId(plain.userCardId),
    effectivePaymentStatus: getEffectivePaymentStatus(plain),
    summary,
  };
};

export const serializeTransaction = (transaction, statement = null, card = null) => {
  const plain = transaction?.toObject?.() ?? { ...transaction };
  const derived = calculateTransactionDerived(plain);
  return {
    ...plain,
    _id: toId(plain._id),
    userCardId: toId(plain.userCardId),
    statementId: toId(plain.statementId),
    derived,
    statement: statement ? serializeStatement(statement) : undefined,
    card: card
      ? {
          _id: toId(card._id),
          providerName: card.providerName ?? card.bank,
          displayName: card.displayName ?? card.name,
          network: card.network ?? card.type,
          owner: card.owner ?? "Tôi",
        }
      : undefined,
  };
};

const normalizeTransactionInput = (input, current = null) => {
  if (!isObject(input)) throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.");

  const transactionDate =
    input.transactionDate !== undefined ? assertDateOnly(input.transactionDate, "transactionDate") : current?.transactionDate;
  const outcomeAmount =
    input.outcomeAmount !== undefined ? asInteger(input.outcomeAmount, "outcomeAmount", { min: 1 }) : current?.outcomeAmount;
  const incomeInputMode =
    input.incomeInputMode === INCOME_INPUT_MODES.RATE ? INCOME_INPUT_MODES.RATE : INCOME_INPUT_MODES.AMOUNT;
  const cashbackRateBps =
    input.cashbackRateBps !== undefined
      ? asInteger(input.cashbackRateBps, "cashbackRateBps", { min: 0, max: 10000 })
      : current?.cashbackRateBps ?? 0;
  const eligibleForAnnualFeeWaiver =
    input.eligibleForAnnualFeeWaiver !== undefined
      ? asBoolean(input.eligibleForAnnualFeeWaiver, "eligibleForAnnualFeeWaiver", true)
      : current?.eligibleForAnnualFeeWaiver ?? true;
  const note = input.note !== undefined ? asString(input.note, "note", { maxLength: MAX_NOTE_LENGTH }) : current?.note ?? "";

  let incomeAmount;
  let partnerReturnRateBps;

  if (incomeInputMode === INCOME_INPUT_MODES.RATE) {
    partnerReturnRateBps =
      input.partnerReturnRateBps !== undefined
        ? asInteger(input.partnerReturnRateBps, "partnerReturnRateBps", { min: 0, max: 10000 })
        : current?.partnerReturnRateBps ?? 0;
    incomeAmount = deriveIncomeFromRate(outcomeAmount, partnerReturnRateBps);
  } else {
    incomeAmount =
      input.incomeAmount !== undefined
        ? asInteger(input.incomeAmount, "incomeAmount", { min: 0 })
        : current?.incomeAmount ?? 0;
    partnerReturnRateBps = deriveRateFromIncome(outcomeAmount, incomeAmount);
  }

  if (incomeAmount > outcomeAmount) {
    throw apiError(400, "INVALID_INCOME_AMOUNT", "Số tiền đối tác hoàn lại không hợp lệ.", {
      incomeAmount: "incomeAmount phải nhỏ hơn hoặc bằng outcomeAmount.",
    });
  }

  return {
    transactionDate,
    outcomeAmount,
    incomeAmount,
    partnerReturnRateBps,
    incomeInputMode,
    cashbackRateBps,
    eligibleForAnnualFeeWaiver,
    note,
  };
};

export const getOrCreateStatementForTransaction = async ({ card, transactionDate, CardStatementModel, session }) => {
  const { statementDay, paymentDueDays } = getCardConfig(card);
  const period = buildStatementPeriod({ transactionDate, statementDay, paymentDueDays });
  const query = workspaceQuery(session, {
    userCardId: card._id,
    statementDate: period.statementDate,
  });
  const update = {
    $setOnInsert: {
      ...ownershipFields(session),
      userCardId: card._id,
      ...period,
      paymentStatus: PAYMENT_STATUSES.OPEN,
      paidAt: null,
      paidAmount: null,
    },
  };

  return CardStatementModel.findOneAndUpdate(query, update, {
    new: true,
    upsert: true,
    returnDocument: "after",
  });
};

const assertStatementEditable = (statement) => {
  if (statement?.paymentStatus === PAYMENT_STATUSES.PAID) {
    throw apiError(409, "STATEMENT_PAID_LOCKED", "Kỳ sao kê đã thanh toán. Hãy mở lại kỳ sao kê trước khi chỉnh sửa giao dịch.");
  }
};

const confirmationFlag = (statements = []) =>
  statements.some((statement) => statement?.paymentStatus === PAYMENT_STATUSES.STATEMENT_CLOSED);

export const listTransactions = async ({ searchParams, deps, session }) => {
  const { TransactionModel, CardModel, CardStatementModel } = deps;
  const query = workspaceQuery(session);
  const date = searchParams.get("date");
  const userCardId = searchParams.get("cardId") ?? searchParams.get("userCardId");
  const statementId = searchParams.get("statementId");

  if (date) query.transactionDate = assertDateOnly(date, "date");
  if (userCardId) {
    assertObjectId(userCardId, "cardId");
    query.userCardId = userCardId;
  }
  if (statementId) {
    assertObjectId(statementId, "statementId");
    query.statementId = statementId;
  }

  const transactions = await TransactionModel.find(query).sort({ transactionDate: -1, createdAt: -1 });
  const cardIds = [...new Set(transactions.map((transaction) => toId(transaction.userCardId)))];
  const statementIds = [...new Set(transactions.map((transaction) => toId(transaction.statementId)))];
  const [cards, statements] = await Promise.all([
    cardIds.length ? CardModel.find(workspaceQuery(session, { _id: { $in: cardIds } })) : [],
    statementIds.length ? CardStatementModel.find(workspaceQuery(session, { _id: { $in: statementIds } })) : [],
  ]);
  const cardsById = new Map(cards.map((card) => [toId(card._id), card]));
  const statementsById = new Map(statements.map((statement) => [toId(statement._id), statement]));

  return transactions.map((transaction) =>
    serializeTransaction(transaction, statementsById.get(toId(transaction.statementId)), cardsById.get(toId(transaction.userCardId))),
  );
};

export const createTransaction = async (input, deps = {}, session = null) => {
  const { TransactionModel, CardModel, CardStatementModel } = deps;
  const userCardId = asString(input?.userCardId ?? input?.cardId, "cardId", { required: true });
  const card = await assertOwnedCard(userCardId, { CardModel, session });
  const normalized = normalizeTransactionInput(input);
  const statement = await getOrCreateStatementForTransaction({
    card,
    transactionDate: normalized.transactionDate,
    CardStatementModel,
    session,
  });

  assertStatementEditable(statement);

  const transaction = await TransactionModel.create({
    ...ownershipFields(session),
    userCardId: card._id,
    statementId: statement._id,
    ...normalized,
    cashbackStatus: CASHBACK_STATUSES.PENDING,
    actualCashbackAmount: null,
  });

  return {
    transaction: serializeTransaction(transaction, statement, card),
    requiresClosedStatementConfirmation: confirmationFlag([statement]),
  };
};

export const updateTransaction = async (transactionId, input, deps = {}, session = null) => {
  const { TransactionModel, CardModel, CardStatementModel } = deps;
  assertObjectId(transactionId, "transactionId");
  const existing = await TransactionModel.findById(transactionId);
  if (!existing || (session && existing.workspaceId !== session.workspaceId)) {
    throw apiError(404, "TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch.");
  }

  const oldStatement = await CardStatementModel.findById(existing.statementId);
  assertStatementEditable(oldStatement);

  const targetCardId = input?.userCardId ?? input?.cardId ?? existing.userCardId;
  const card = await assertOwnedCard(toId(targetCardId), { CardModel, session });
  const normalized = normalizeTransactionInput(input, existing);
  const targetStatement = await getOrCreateStatementForTransaction({
    card,
    transactionDate: normalized.transactionDate,
    CardStatementModel,
    session,
  });
  assertStatementEditable(targetStatement);

  const updated = await TransactionModel.findByIdAndUpdate(
    transactionId,
    {
      userCardId: card._id,
      statementId: targetStatement._id,
      ...normalized,
    },
    { returnDocument: "after" },
  );

  return {
    transaction: serializeTransaction(updated, targetStatement, card),
    requiresClosedStatementConfirmation: confirmationFlag([oldStatement, targetStatement]),
  };
};

export const deleteTransaction = async (transactionId, deps = {}, session = null) => {
  const { TransactionModel, CardStatementModel } = deps;
  assertObjectId(transactionId, "transactionId");
  const existing = await TransactionModel.findById(transactionId);
  if (!existing || (session && existing.workspaceId !== session.workspaceId)) {
    throw apiError(404, "TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch.");
  }
  const statement = await CardStatementModel.findById(existing.statementId);
  assertStatementEditable(statement);
  await TransactionModel.findByIdAndDelete(transactionId);
  return { deletedId: transactionId, requiresClosedStatementConfirmation: confirmationFlag([statement]) };
};

export const updateTransactionCashback = async (transactionId, input, deps = {}, session = null) => {
  const { TransactionModel, CardStatementModel, CardModel } = deps;
  assertObjectId(transactionId, "transactionId");
  const existing = await TransactionModel.findById(transactionId);
  if (!existing || (session && existing.workspaceId !== session.workspaceId)) {
    throw apiError(404, "TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch.");
  }
  const statement = await CardStatementModel.findById(existing.statementId);
  assertStatementEditable(statement);

  const cashbackStatus = asString(input?.cashbackStatus, "cashbackStatus", { required: true });
  if (!Object.values(CASHBACK_STATUSES).includes(cashbackStatus)) {
    throw apiError(400, "INVALID_CASHBACK_STATUS", "Trạng thái cashback không hợp lệ.");
  }
  const actualCashbackAmount =
    cashbackStatus === CASHBACK_STATUSES.RECEIVED
      ? asInteger(input?.actualCashbackAmount, "actualCashbackAmount", { min: 0 })
      : null;

  const updated = await TransactionModel.findByIdAndUpdate(
    transactionId,
    { cashbackStatus, actualCashbackAmount },
    { returnDocument: "after" },
  );
  const card = await CardModel.findById(updated.userCardId);
  return { transaction: serializeTransaction(updated, statement, card), requiresClosedStatementConfirmation: confirmationFlag([statement]) };
};

export const listStatementsForCard = async (cardId, deps = {}, session = null) => {
  const { CardModel, CardStatementModel, TransactionModel } = deps;
  await assertOwnedCard(cardId, { CardModel, session });
  const statements = await CardStatementModel.find(workspaceQuery(session, { userCardId: cardId })).sort({ statementDate: -1 });
  const statementIds = statements.map((statement) => statement._id);
  const transactions = statementIds.length
    ? await TransactionModel.find(workspaceQuery(session, { statementId: { $in: statementIds } })).sort({
        transactionDate: -1,
        createdAt: -1,
      })
    : [];
  const transactionsByStatement = new Map();
  for (const transaction of transactions) {
    const key = toId(transaction.statementId);
    const list = transactionsByStatement.get(key) ?? [];
    list.push(transaction);
    transactionsByStatement.set(key, list);
  }
  return statements.map((statement) => serializeStatement(statement, transactionsByStatement.get(toId(statement._id)) ?? []));
};

export const getStatementDetail = async (cardId, statementId, deps = {}, session = null) => {
  const { CardModel, CardStatementModel, TransactionModel } = deps;
  await assertOwnedCard(cardId, { CardModel, session });
  assertObjectId(statementId, "statementId");
  const statement = await CardStatementModel.findById(statementId);
  if (!statement || (session && statement.workspaceId !== session.workspaceId) || toId(statement.userCardId) !== toId(cardId)) {
    throw apiError(404, "STATEMENT_NOT_FOUND", "Không tìm thấy kỳ sao kê.");
  }
  const transactions = await TransactionModel.find(workspaceQuery(session, { statementId })).sort({
    transactionDate: -1,
    createdAt: -1,
  });
  return {
    ...serializeStatement(statement, transactions),
    transactions: transactions.map((transaction) => serializeTransaction(transaction, statement)),
  };
};

export const markStatementPaid = async (cardId, statementId, deps = {}, session = null) => {
  const { CardStatementModel, TransactionModel } = deps;
  const detail = await getStatementDetail(cardId, statementId, deps, session);
  if (detail.paymentStatus === PAYMENT_STATUSES.PAID) return detail;
  const transactions = await TransactionModel.find(workspaceQuery(session, { statementId }));
  const summary = summarizeTransactions(transactions);
  const updated = await CardStatementModel.findByIdAndUpdate(
    statementId,
    { paymentStatus: PAYMENT_STATUSES.PAID, paidAt: new Date(), paidAmount: summary.totalAmountDue },
    { returnDocument: "after" },
  );
  return serializeStatement(updated, transactions);
};

export const closeStatement = async (cardId, statementId, deps = {}, session = null) => {
  const { CardStatementModel, TransactionModel } = deps;
  const detail = await getStatementDetail(cardId, statementId, deps, session);
  if (detail.paymentStatus === PAYMENT_STATUSES.PAID) {
    throw apiError(409, "STATEMENT_PAID_LOCKED", "Kỳ sao kê đã thanh toán. Hãy mở lại kỳ sao kê trước.");
  }
  const transactions = await TransactionModel.find(workspaceQuery(session, { statementId }));
  const updated = await CardStatementModel.findByIdAndUpdate(
    statementId,
    { paymentStatus: PAYMENT_STATUSES.STATEMENT_CLOSED },
    { returnDocument: "after" },
  );
  return serializeStatement(updated, transactions);
};

export const reopenStatement = async (cardId, statementId, deps = {}, session = null) => {
  const { CardStatementModel, TransactionModel } = deps;
  const detail = await getStatementDetail(cardId, statementId, deps, session);
  if (detail.paymentStatus !== PAYMENT_STATUSES.PAID) return detail;
  const transactions = await TransactionModel.find(workspaceQuery(session, { statementId }));
  const updated = await CardStatementModel.findByIdAndUpdate(
    statementId,
    { paymentStatus: PAYMENT_STATUSES.STATEMENT_CLOSED, paidAt: null, paidAmount: null },
    { returnDocument: "after" },
  );
  return serializeStatement(updated, transactions);
};
