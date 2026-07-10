import { CASHBACK_CAP_PERIODS, calculateEligibleCashback } from "./cashbackCapCore.mjs";

export const PAYMENT_STATUSES = Object.freeze({
  OPEN: "OPEN",
  STATEMENT_CLOSED: "STATEMENT_CLOSED",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
});

export const CASHBACK_STATUSES = Object.freeze({
  PENDING: "PENDING",
  RECEIVED: "RECEIVED",
  REJECTED: "REJECTED",
});

export const INCOME_INPUT_MODES = Object.freeze({
  AMOUNT: "AMOUNT",
  RATE: "RATE",
});

export { CASHBACK_CAP_LABELS, CASHBACK_CAP_PERIODS, calculateEligibleCashback } from "./cashbackCapCore.mjs";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isDateOnlyString = (value) => {
  if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value)) return false;
  const parsed = parseDateOnly(value);
  return formatDateOnly(parsed) === value;
};

export const parseDateOnly = (value) => {
  const [year, month, day] = String(value).split("-").map(Number);
  return { year, month, day };
};

export const formatDateOnly = ({ year, month, day }) =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const dateOnlyToUtcMs = (value) => {
  const { year, month, day } = typeof value === "string" ? parseDateOnly(value) : value;
  return Date.UTC(year, month - 1, day);
};

export const compareDateOnly = (left, right) => Math.sign(dateOnlyToUtcMs(left) - dateOnlyToUtcMs(right));

export const lastDayOfMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

export const clampStatementDay = (year, month, statementDay) => Math.min(statementDay, lastDayOfMonth(year, month));

export const addDays = (dateOnly, days) => {
  const { year, month, day } = typeof dateOnly === "string" ? parseDateOnly(dateOnly) : dateOnly;
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateOnly({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
};

export const addMonths = ({ year, month }, months) => {
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
};

export const getStatementDateForMonth = (year, month, statementDay) =>
  formatDateOnly({ year, month, day: clampStatementDay(year, month, statementDay) });

export const resolveStatementDate = (transactionDate, statementDay) => {
  const tx = parseDateOnly(transactionDate);
  const currentMonthStatement = getStatementDateForMonth(tx.year, tx.month, statementDay);
  if (compareDateOnly(transactionDate, currentMonthStatement) <= 0) return currentMonthStatement;

  const nextMonth = addMonths({ year: tx.year, month: tx.month }, 1);
  return getStatementDateForMonth(nextMonth.year, nextMonth.month, statementDay);
};

export const resolvePreviousStatementDate = (statementDate, statementDay) => {
  const current = parseDateOnly(statementDate);
  const previousMonth = addMonths({ year: current.year, month: current.month }, -1);
  return getStatementDateForMonth(previousMonth.year, previousMonth.month, statementDay);
};

export const buildStatementPeriod = ({ transactionDate, statementDay, paymentDueDays }) => {
  const statementDate = resolveStatementDate(transactionDate, statementDay);
  const previousStatementDate = resolvePreviousStatementDate(statementDate, statementDay);

  return {
    periodStartDate: addDays(previousStatementDate, 1),
    periodEndDate: statementDate,
    statementDate,
    paymentDueDate: addDays(statementDate, paymentDueDays),
    statementDaySnapshot: statementDay,
    paymentDueDaysSnapshot: paymentDueDays,
  };
};

export const getEffectivePaymentStatus = (statement, today = formatDateOnlyFromDate(new Date())) => {
  if (!statement) return PAYMENT_STATUSES.OPEN;
  if (statement.paymentStatus === PAYMENT_STATUSES.PAID) return PAYMENT_STATUSES.PAID;
  if (statement.paymentDueDate && compareDateOnly(today, statement.paymentDueDate) > 0) {
    return PAYMENT_STATUSES.OVERDUE;
  }
  return statement.paymentStatus || PAYMENT_STATUSES.OPEN;
};

export const formatDateOnlyFromDate = (date) =>
  formatDateOnly({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });

export const roundVnd = (value) => Math.round(Number(value));

export const roundBps = (value) => Math.round(Number(value));

export const deriveIncomeFromRate = (outcomeAmount, partnerReturnRateBps) =>
  roundVnd((outcomeAmount * partnerReturnRateBps) / 10000);

export const deriveRateFromIncome = (outcomeAmount, incomeAmount) =>
  outcomeAmount > 0 ? roundBps((incomeAmount * 10000) / outcomeAmount) : 0;

export const calculateTransactionDerived = (transaction) => {
  const outcomeAmount = Number(transaction?.outcomeAmount ?? 0);
  const incomeAmount = Number(transaction?.incomeAmount ?? 0);
  const cashbackRateBps = Number(transaction?.cashbackRateBps ?? 0);
  const serviceFee = outcomeAmount - incomeAmount;
  const cashbackByRateAmount = roundVnd((outcomeAmount * cashbackRateBps) / 10000);
  const expectedCashbackAmount = cashbackByRateAmount;
  const expectedNetProfit = expectedCashbackAmount - serviceFee;
  const cashbackStatus = transaction?.cashbackStatus ?? CASHBACK_STATUSES.PENDING;
  const actualCashbackAmount =
    cashbackStatus === CASHBACK_STATUSES.RECEIVED ? Number(transaction?.actualCashbackAmount ?? 0) : 0;
  const actualNetProfit =
    cashbackStatus === CASHBACK_STATUSES.PENDING ? null : actualCashbackAmount - serviceFee;

  return {
    serviceFee,
    cashbackByRateAmount,
    expectedCashbackAmount,
    eligibleCashbackAmount: expectedCashbackAmount,
    exceededCashbackAmount: 0,
    expectedNetProfit,
    actualCashbackAmount,
    actualNetProfit,
  };
};

export const summarizeTransactions = (transactions = [], options = {}) => {
  const totals = transactions.reduce(
    (acc, transaction) => {
      const derived = calculateTransactionDerived(transaction);
      const outcomeAmount = Number(transaction?.outcomeAmount ?? 0);
      const incomeAmount = Number(transaction?.incomeAmount ?? 0);
      acc.totalOutcome += outcomeAmount;
      acc.totalIncome += incomeAmount;
      acc.totalServiceFee += derived.serviceFee;
      acc.cashbackByRate += derived.cashbackByRateAmount;
      acc.actualCashback += derived.actualCashbackAmount;
      if (transaction?.eligibleForAnnualFeeWaiver !== false) acc.annualEligibleSpend += outcomeAmount;
      acc.transactionCount += 1;
      return acc;
    },
    {
      totalOutcome: 0,
      totalIncome: 0,
      totalServiceFee: 0,
      cashbackByRate: 0,
      actualCashback: 0,
      annualEligibleSpend: 0,
      transactionCount: 0,
    },
  );
  const cashbackCap = calculateEligibleCashback(
    transactions,
    options.cashbackCapAmount,
    options.cashbackCapPeriod ?? CASHBACK_CAP_PERIODS.STATEMENT,
    {
      cashbackByRate: totals.cashbackByRate,
      actualCashback: totals.actualCashback,
      statement: options.statement ?? null,
    },
  );
  const expectedNetProfit = cashbackCap.eligibleCashback - totals.totalServiceFee;
  const actualNetProfit = cashbackCap.actualCashback - totals.totalServiceFee;

  return {
    ...totals,
    expectedCashback: cashbackCap.eligibleCashback,
    eligibleCashback: cashbackCap.eligibleCashback,
    exceededCashback: cashbackCap.exceededCashback,
    remainingCashback: cashbackCap.remainingCashback,
    cashbackCap,
    expectedNetProfit,
    actualNetProfit,
    totalAmountDue: totals.totalOutcome,
  };
};
