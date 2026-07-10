import { serializeCreditCards } from "../cards/serializerCore.mjs";
import { summarizeTransactions } from "../cards/statementCore.mjs";
import { calculateCardMetrics, getMonthlyData, numberOrZero } from "../cards/uiCore.mjs";

const toId = (value) => (value && typeof value.toString === "function" ? value.toString() : value);

export const buildReportSummary = ({ cards = [], notes = [], filters = {} }) => {
  const serializedCards = serializeCreditCards(cards);

  const cardSummaries = serializedCards.map((card) => {
    const metrics = calculateCardMetrics(card);
    const amountDueThisMonth = numberOrZero(card.amountDueThisMonth);

    return {
      id: toId(card._id),
      _id: toId(card._id),
      presetId: card.presetId ?? null,
      providerCode: card.providerCode ?? null,
      providerName: card.providerName,
      displayName: card.displayName,
      network: card.network,
      imageUrl: card.imageUrl ?? null,
      legacy: card.legacy,
      bank: card.bank,
      name: card.name,
      type: card.type,
      owner: card.owner || "Tôi",
      statementDate: card.statementDate || "",
      paymentDueDate: card.paymentDueDate || "",
      amountDueThisMonth,
      isPaidThisMonth: Boolean(card.isPaidThisMonth),
      annualFee: card.annualFee ?? null,
      annualFeeKnown: metrics.annualFeeKnown,
      targetSpendForWaiver: metrics.targetSpendForWaiver,
      totals: {
        spend: metrics.totalSpend,
        cashback: metrics.totalCashback,
        fee: metrics.totalFee,
        otherInterest: metrics.totalOtherInterest,
        annualFeeApplied: metrics.annualFeeApplied,
        netProfit: metrics.netProfit,
      },
      monthlyData: getMonthlyData(card),
    };
  });

  const totals = cardSummaries.reduce(
    (acc, card) => ({
      spend: acc.spend + card.totals.spend,
      cashback: acc.cashback + card.totals.cashback,
      fee: acc.fee + card.totals.fee,
      otherInterest: acc.otherInterest + card.totals.otherInterest,
      annualFeeApplied: acc.annualFeeApplied + card.totals.annualFeeApplied,
      netProfit: acc.netProfit + card.totals.netProfit,
      amountDueThisMonth: acc.amountDueThisMonth + card.amountDueThisMonth,
      unpaidAmountDueThisMonth:
        acc.unpaidAmountDueThisMonth + (card.isPaidThisMonth ? 0 : card.amountDueThisMonth),
    }),
    {
      spend: 0,
      cashback: 0,
      fee: 0,
      otherInterest: 0,
      annualFeeApplied: 0,
      netProfit: 0,
      amountDueThisMonth: 0,
      unpaidAmountDueThisMonth: 0,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    filters,
    totals,
    cards: cardSummaries,
    notes: notes.map((note) => ({
      id: toId(note._id),
      date: note.date,
      content: note.content,
    })),
  };
};

export const buildTransactionReportSummary = ({ cards = [], statements = [], transactions = [], filters = {} }) => {
  const serializedCards = serializeCreditCards(cards);
  const transactionsByCard = new Map();
  for (const transaction of transactions) {
    const key = transaction.userCardId?.toString?.() ?? String(transaction.userCardId);
    const list = transactionsByCard.get(key) ?? [];
    list.push(transaction);
    transactionsByCard.set(key, list);
  }

  const statementsByCard = new Map();
  for (const statement of statements) {
    const key = statement.userCardId?.toString?.() ?? String(statement.userCardId);
    const list = statementsByCard.get(key) ?? [];
    list.push(statement);
    statementsByCard.set(key, list);
  }

  const cardSummaries = serializedCards.map((card) => {
    const id = toId(card._id);
    const cardTransactions = transactionsByCard.get(id) ?? [];
    const summary = summarizeTransactions(cardTransactions);

    return {
      id,
      _id: id,
      presetId: card.presetId ?? null,
      providerCode: card.providerCode ?? null,
      providerName: card.providerName,
      displayName: card.displayName,
      network: card.network,
      imageUrl: card.imageUrl ?? null,
      legacy: card.legacy,
      bank: card.bank,
      name: card.name,
      type: card.type,
      owner: card.owner || "Tôi",
      statementDay: card.statementDay ?? 1,
      paymentDueDays: card.paymentDueDays ?? 15,
      annualFee: card.annualFee ?? null,
      annualFeeWaiverTarget: card.annualFeeWaiverTarget ?? card.targetSpendForWaiver ?? 0,
      active: card.active !== false,
      totals: summary,
      statements: (statementsByCard.get(id) ?? []).map((statement) => ({
        id: toId(statement._id),
        statementDate: statement.statementDate,
        paymentDueDate: statement.paymentDueDate,
        paymentStatus: statement.paymentStatus,
        paidAt: statement.paidAt ?? null,
        paidAmount: statement.paidAmount ?? null,
      })),
    };
  });

  const totals = cardSummaries.reduce(
    (acc, card) => ({
      totalOutcome: acc.totalOutcome + card.totals.totalOutcome,
      totalIncome: acc.totalIncome + card.totals.totalIncome,
      totalServiceFee: acc.totalServiceFee + card.totals.totalServiceFee,
      expectedCashback: acc.expectedCashback + card.totals.expectedCashback,
      actualCashback: acc.actualCashback + card.totals.actualCashback,
      expectedNetProfit: acc.expectedNetProfit + card.totals.expectedNetProfit,
      actualNetProfit: acc.actualNetProfit + card.totals.actualNetProfit,
      annualEligibleSpend: acc.annualEligibleSpend + card.totals.annualEligibleSpend,
      totalAmountDue: acc.totalAmountDue + card.totals.totalAmountDue,
    }),
    {
      totalOutcome: 0,
      totalIncome: 0,
      totalServiceFee: 0,
      expectedCashback: 0,
      actualCashback: 0,
      expectedNetProfit: 0,
      actualNetProfit: 0,
      annualEligibleSpend: 0,
      totalAmountDue: 0,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    filters,
    totals,
    cards: cardSummaries,
  };
};
