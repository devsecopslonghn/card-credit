import { compareDateOnly, formatDateOnlyFromDate } from "./statementCore.mjs";

const toMonthKey = (date) => date.slice(0, 7);

const monthLabel = (monthKey) => {
  const [year, month] = monthKey.split("-");
  return `Tháng ${month}/${year}`;
};

const getCard = (cardsById, statement) => cardsById.get(statement.userCardId);

export const getStatementDueStatus = (statement, today = formatDateOnlyFromDate(new Date())) => {
  if (statement.paymentStatus === "PAID" || statement.effectivePaymentStatus === "PAID") return "PAID";
  const comparison = compareDateOnly(statement.paymentDueDate, today);
  if (comparison < 0 || statement.effectivePaymentStatus === "OVERDUE") return "OVERDUE";
  if (comparison === 0) return "DUE_TODAY";
  return "UPCOMING";
};

export const buildDueStatementGroups = ({ statements = [], cards = [], today = formatDateOnlyFromDate(new Date()) }) => {
  const cardsById = new Map(cards.map((card) => [card._id, card]));
  const rows = statements
    .map((statement) => {
      const card = getCard(cardsById, statement);
      if (!card) return null;
      const amountDue = Number(statement.summary?.totalAmountDue ?? 0);
      const status = getStatementDueStatus(statement, today);
      return {
        statement,
        card,
        amountDue,
        status,
      };
    })
    .filter(Boolean)
    .filter(({ statement, amountDue, status }) => {
      if (amountDue <= 0) return false;
      if (status === "PAID" || status === "OVERDUE") return false;
      if (compareDateOnly(statement.statementDate, today) > 0) return false;
      return true;
    })
    .sort((left, right) => {
      const dueComparison = left.statement.paymentDueDate.localeCompare(right.statement.paymentDueDate);
      if (dueComparison !== 0) return dueComparison;
      const bankComparison = (left.card.providerName ?? left.card.bank ?? "").localeCompare(
        right.card.providerName ?? right.card.bank ?? "",
        "vi",
      );
      if (bankComparison !== 0) return bankComparison;
      return (left.card.displayName ?? left.card.name ?? "").localeCompare(right.card.displayName ?? right.card.name ?? "", "vi");
    });

  const groups = new Map();
  for (const row of rows) {
    const monthKey = toMonthKey(row.statement.paymentDueDate);
    const group = groups.get(monthKey) ?? {
      monthKey,
      monthLabel: monthLabel(monthKey),
      dueCount: 0,
      dueAmount: 0,
      rows: [],
    };
    group.rows.push(row);
    group.dueCount += 1;
    group.dueAmount += row.amountDue;
    groups.set(monthKey, group);
  }

  return [...groups.values()].sort((left, right) => left.monthKey.localeCompare(right.monthKey));
};

export const buildOverdueStatementRows = ({ statements = [], cards = [], today = formatDateOnlyFromDate(new Date()) }) => {
  const cardsById = new Map(cards.map((card) => [card._id, card]));
  return statements
    .map((statement) => {
      const card = getCard(cardsById, statement);
      if (!card) return null;
      const amountDue = Number(statement.summary?.totalAmountDue ?? 0);
      const status = getStatementDueStatus(statement, today);
      return { statement, card, amountDue, status };
    })
    .filter(Boolean)
    .filter(({ amountDue, status }) => amountDue > 0 && status === "OVERDUE")
    .sort((left, right) => left.statement.paymentDueDate.localeCompare(right.statement.paymentDueDate));
};
