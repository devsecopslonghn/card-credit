import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { connectToDatabase } from "@/lib/mongodb";
import { buildReportSummary } from "@/lib/reports/summaryCore.mjs";
import CreditCard from "@/models/CreditCard";
import CalendarNote from "@/models/CalendarNote";

export const dynamic = "force-dynamic";

type ReportCard = Record<string, unknown> & {
  _id?: { toString: () => string };
};

type CalendarNoteRecord = {
  _id?: { toString: () => string };
  date?: string;
  content?: string;
};

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner")?.trim();
    const includeNotes = searchParams.get("includeNotes") !== "false";

    const cardQuery = owner ? { owner } : {};
    const cards = (await CreditCard.find(cardQuery).sort({ bank: 1, name: 1 }).lean()) as ReportCard[];
    const notes = includeNotes ? ((await CalendarNote.find().sort({ date: 1 }).lean()) as CalendarNoteRecord[]) : [];

    return NextResponse.json(buildReportSummary({ cards, notes, filters: { owner: owner || null, includeNotes } }));
  } catch (error) {
    return handleApiError("GET /api/reports/summary failed", error);
  }
}
