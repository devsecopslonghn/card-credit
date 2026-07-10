export const CASHBACK_CAP_PERIODS = Object.freeze({
  STATEMENT: "STATEMENT",
  CALENDAR_MONTH: "CALENDAR_MONTH",
});

export const CASHBACK_CAP_LABELS = Object.freeze({
  [CASHBACK_CAP_PERIODS.STATEMENT]: "Cashback tối đa kỳ sao kê",
  [CASHBACK_CAP_PERIODS.CALENDAR_MONTH]: "Cashback tối đa tháng",
});

const normalizeCapAmount = (cashbackCap) => {
  if (cashbackCap === null || cashbackCap === undefined || cashbackCap === "") return null;
  const amount = Number(cashbackCap);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null;
};

const unlimitedResult = ({ cashbackByRate, actualCashback }) => ({
  capAmount: null,
  unlimited: true,
  cashbackByRate,
  eligibleCashback: cashbackByRate,
  actualCashback,
  exceededCashback: 0,
  remainingCashback: null,
  capUsedPercent: null,
});

const statementStrategy = {
  calculate({ cashbackByRate, actualCashback, cashbackCap }) {
    const capAmount = normalizeCapAmount(cashbackCap);
    if (capAmount === null) return unlimitedResult({ cashbackByRate, actualCashback });

    const eligibleCashback = Math.min(cashbackByRate, capAmount);
    const cappedActualCashback = Math.min(actualCashback, capAmount);
    const exceededCashback = Math.max(cashbackByRate - capAmount, 0);
    const remainingCashback = Math.max(capAmount - eligibleCashback, 0);
    const capUsedPercent = capAmount > 0 ? Math.round((eligibleCashback * 10000) / capAmount) / 100 : 100;

    return {
      capAmount,
      unlimited: false,
      cashbackByRate,
      eligibleCashback,
      actualCashback: cappedActualCashback,
      exceededCashback,
      remainingCashback,
      capUsedPercent,
    };
  },
};

const unsupportedStrategy = (period) => ({
  calculate() {
    throw new Error(`Cashback cap period is not implemented: ${period}`);
  },
});

const strategies = new Map([[CASHBACK_CAP_PERIODS.STATEMENT, statementStrategy]]);

export const getCashbackCapStrategy = (cashbackCapPeriod = CASHBACK_CAP_PERIODS.STATEMENT) =>
  strategies.get(cashbackCapPeriod) ?? unsupportedStrategy(cashbackCapPeriod);

export const calculateEligibleCashback = (transactions, cashbackCap, cashbackCapPeriod = CASHBACK_CAP_PERIODS.STATEMENT, context = {}) => {
  const cashbackByRate = Number(context.cashbackByRate ?? 0);
  const actualCashback = Number(context.actualCashback ?? 0);
  return getCashbackCapStrategy(cashbackCapPeriod).calculate({
    transactions,
    cashbackByRate,
    actualCashback,
    cashbackCap,
    context,
  });
};
