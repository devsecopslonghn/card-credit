import { NextResponse } from "next/server.js";
import { buildReportSummary } from "../reports/summaryCore.mjs";
import { handleApiError } from "./errorsCore.mjs";

export const createReportSummaryRouteHandler = ({ connectToDatabase, CardModel, CalendarNoteModel }) => async (request) => {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner")?.trim();
    const includeNotes = searchParams.get("includeNotes") !== "false";

    const cardQuery = owner ? { owner } : {};
    const cards = await CardModel.find(cardQuery).sort({ bank: 1, name: 1 }).lean();
    const notes = includeNotes ? await CalendarNoteModel.find().sort({ date: 1 }).lean() : [];

    return NextResponse.json(buildReportSummary({ cards, notes, filters: { owner: owner || null, includeNotes } }));
  } catch (error) {
    return handleApiError("GET /api/reports/summary failed", error);
  }
};
