import { serializeCreditCards } from "../cards/serializerCore.mjs";
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
