import { addMonths, compareDateOnly, formatDateOnlyFromDate, parseDateOnly } from "./statementCore.mjs";

const toMonthKey = (dateOnly) => (typeof dateOnly === "string" && dateOnly.length >= 7 ? dateOnly.slice(0, 7) : "");

const formatMonthKey = ({ year, month }) => `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;

const getAmountDue = (statement) => Number(statement?.summary?.totalAmountDue ?? 0);

const isPaidStatement = (statement) =>
  statement?.paymentStatus === "PAID" || statement?.effectivePaymentStatus === "PAID";

export const isOutstandingDebtStatement = (statement, today = formatDateOnlyFromDate(new Date())) => {
  if (!statement) return false;
  if (isPaidStatement(statement)) return false;
  if (getAmountDue(statement) <= 0) return false;
  if (statement.statementDate && compareDateOnly(statement.statementDate, today) > 0) return false;
  return true;
};

export const summarizeCardDebt = (statements = [], today = formatDateOnlyFromDate(new Date())) => {
  const currentDate = parseDateOnly(today);
  const currentMonthKey = formatMonthKey({ year: currentDate.year, month: currentDate.month });
  const nextMonthKey = formatMonthKey(addMonths({ year: currentDate.year, month: currentDate.month }, 1));
  const outstandingStatements = statements.filter((statement) => isOutstandingDebtStatement(statement, today));

  const summary = {
    totalOutstanding: 0,
    outstandingCount: 0,
    currentMonthDue: 0,
    currentMonthDueCount: 0,
    nextMonthDue: 0,
    nextMonthDueCount: 0,
    currentMonthKey,
    nextMonthKey,
  };

  for (const statement of outstandingStatements) {
    const amountDue = getAmountDue(statement);
    const dueMonthKey = toMonthKey(statement.paymentDueDate);
    summary.totalOutstanding += amountDue;
    summary.outstandingCount += 1;

    if (dueMonthKey === currentMonthKey) {
      summary.currentMonthDue += amountDue;
      summary.currentMonthDueCount += 1;
    }

    if (dueMonthKey === nextMonthKey) {
      summary.nextMonthDue += amountDue;
      summary.nextMonthDueCount += 1;
    }
  }

  return summary;
};
