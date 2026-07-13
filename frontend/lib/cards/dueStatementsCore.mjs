import { formatDateOnlyFromDate } from "./statementCore.mjs";

const formatDateOnly = (year, month, day) =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const normalizePaymentDate = (value) => {
  if (typeof value !== "string") return null;
  const input = value.trim();
  let year;
  let month;
  let day;
  let match = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (match) [, year, month, day] = match;
  else {
    match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    [, day, month, year] = match;
  }

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) return null;
  return formatDateOnly(year, month, day);
};

export const parsePaymentAmount = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value !== "string" || !value.trim()) return Number.NaN;
  const normalized = value.trim().replace(/[.\s₫đ]/gi, "").replace(/,/g, "");
  if (!/^-?\d+$/.test(normalized)) return Number.NaN;
  return Number(normalized);
};

const monthLabel = (monthKey) => {
  const [year, month] = monthKey.split("-");
  return `Tháng ${month}/${year}`;
};

const isPaid = (statement) =>
  statement?.paymentStatus === "PAID" || statement?.effectivePaymentStatus === "PAID";

export const getRemainingAmountDue = (statement) => {
  const total = parsePaymentAmount(statement?.summary?.totalAmountDue);
  if (!Number.isFinite(total) || isPaid(statement)) return 0;
  const paid = parsePaymentAmount(statement?.paidAmount);
  return Math.max(0, total - (Number.isFinite(paid) ? paid : 0));
};

export const getStatementDueStatus = (statement, today = formatDateOnlyFromDate(new Date())) => {
  if (isPaid(statement)) return "PAID";
  const dueDate = normalizePaymentDate(statement?.paymentDueDate);
  const normalizedToday = normalizePaymentDate(today);
  if (!dueDate || !normalizedToday) return "UPCOMING";
  if (dueDate < normalizedToday || statement.effectivePaymentStatus === "OVERDUE") return "OVERDUE";
  if (dueDate === normalizedToday) return "DUE_TODAY";
  return "UPCOMING";
};

const statementRow = (statement, card, today) => {
  const dueDate = normalizePaymentDate(statement?.paymentDueDate);
  const statementDate = normalizePaymentDate(statement?.statementDate);
  if (!dueDate) return null;
  const remainingAmountDue = getRemainingAmountDue(statement);
  if (!Number.isFinite(remainingAmountDue) || remainingAmountDue <= 0) return null;
  return {
    key: `statement:${statement._id}`,
    statement,
    card,
    statementDate,
    dueDate,
    amountDue: remainingAmountDue,
    remainingAmountDue,
    status: getStatementDueStatus(statement, today),
  };
};

const fallbackRow = (card, summary, today) => {
  const dueDate = normalizePaymentDate(summary?.paymentDueDate ?? card?.paymentDueDate);
  const statementDate = normalizePaymentDate(summary?.statementDate ?? card?.statementDate);
  const remainingAmountDue = parsePaymentAmount(summary?.statementAmountDue ?? card?.amountDueThisMonth);
  if (!dueDate || !Number.isFinite(remainingAmountDue) || remainingAmountDue <= 0 || card?.isPaidThisMonth) return null;
  return {
    key: `card:${card._id}:${dueDate}`,
    statement: null,
    card,
    statementDate,
    dueDate,
    amountDue: remainingAmountDue,
    remainingAmountDue,
    status: getStatementDueStatus({ paymentDueDate: dueDate }, today),
  };
};

export const buildStatementRows = ({ statements = [], cards = [], today = formatDateOnlyFromDate(new Date()) }) => {
  const cardsById = new Map(cards.map((card) => [card._id, card]));
  const seenStatementIds = new Set();
  return statements.flatMap((statement) => {
    if (!statement?._id || seenStatementIds.has(statement._id)) return [];
    seenStatementIds.add(statement._id);
    const card = cardsById.get(statement.userCardId);
    if (!card) return [];
    const row = statementRow(statement, card, today);
    return row ? [row] : [];
  });
};

export const buildUpcomingPaymentRows = ({
  statements = [],
  cards = [],
  cardSummaries = {},
  today = formatDateOnlyFromDate(new Date()),
}) => {
  const rows = buildStatementRows({ statements, cards, today });
  const statementPeriods = new Set(rows.map((row) => `${row.card._id}:${row.dueDate}`));
  for (const card of cards) {
    const fallback = fallbackRow(card, cardSummaries[card._id], today);
    if (fallback && !statementPeriods.has(`${card._id}:${fallback.dueDate}`)) rows.push(fallback);
  }
  return rows;
};

const compareRows = (left, right) =>
  left.dueDate.localeCompare(right.dueDate) ||
  String(left.card.providerName ?? left.card.bank ?? "").localeCompare(String(right.card.providerName ?? right.card.bank ?? ""), "vi") ||
  String(left.card.displayName ?? left.card.name ?? "").localeCompare(String(right.card.displayName ?? right.card.name ?? ""), "vi") ||
  left.key.localeCompare(right.key);

export const buildDueStatementGroups = (input) => {
  const rows = buildUpcomingPaymentRows(input)
    .filter(({ status }) => status !== "PAID" && status !== "OVERDUE")
    .sort(compareRows);
  const groups = new Map();
  for (const row of rows) {
    const monthKey = row.dueDate.slice(0, 7);
    const group = groups.get(monthKey) ?? { monthKey, monthLabel: monthLabel(monthKey), dueCount: 0, dueAmount: 0, rows: [] };
    group.rows.push(row);
    group.dueCount += 1;
    group.dueAmount += row.remainingAmountDue;
    groups.set(monthKey, group);
  }
  return [...groups.values()].sort((left, right) => left.monthKey.localeCompare(right.monthKey));
};

export const buildOverdueStatementRows = (input) =>
  buildUpcomingPaymentRows(input).filter(({ status }) => status === "OVERDUE").sort(compareRows);
