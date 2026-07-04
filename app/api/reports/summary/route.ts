import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CreditCard from "@/models/CreditCard";
import CalendarNote from "@/models/CalendarNote";

export const dynamic = "force-dynamic";

const sumMonthlyField = (monthlyData: any[] = [], field: string) =>
  monthlyData.reduce((sum, month) => sum + Number(month?.[field] || 0), 0);

export async function GET(request: Request) {
  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner")?.trim();
  const includeNotes = searchParams.get("includeNotes") !== "false";

  const cardQuery = owner ? { owner } : {};
  const cards = await CreditCard.find(cardQuery).sort({ bank: 1, name: 1 }).lean();
  const notes = includeNotes ? await CalendarNote.find().sort({ date: 1 }).lean() : [];

  const cardSummaries = cards.map((card: any) => {
    const totalSpend = sumMonthlyField(card.monthlyData, "spend");
    const totalCashback = sumMonthlyField(card.monthlyData, "cashback");
    const totalFee = sumMonthlyField(card.monthlyData, "fee");
    const totalOtherInterest = sumMonthlyField(card.monthlyData, "otherInterest");
    const annualFeeApplied =
      card.targetSpendForWaiver > 0 && totalSpend >= card.targetSpendForWaiver
        ? 0
        : Number(card.annualFee || 0);
    const netProfit = totalCashback + totalOtherInterest - totalFee - annualFeeApplied;

    return {
      id: card._id?.toString(),
      bank: card.bank,
      name: card.name,
      type: card.type,
      owner: card.owner || "Tôi",
      statementDate: card.statementDate || "",
      paymentDueDate: card.paymentDueDate || "",
      amountDueThisMonth: Number(card.amountDueThisMonth || 0),
      isPaidThisMonth: Boolean(card.isPaidThisMonth),
      annualFee: Number(card.annualFee || 0),
      targetSpendForWaiver: Number(card.targetSpendForWaiver || 0),
      totals: {
        spend: totalSpend,
        cashback: totalCashback,
        fee: totalFee,
        otherInterest: totalOtherInterest,
        annualFeeApplied,
        netProfit,
      },
      monthlyData: card.monthlyData || [],
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

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    filters: { owner: owner || null, includeNotes },
    totals,
    cards: cardSummaries,
    notes: notes.map((note: any) => ({
      id: note._id?.toString(),
      date: note.date,
      content: note.content,
    })),
  });
}
