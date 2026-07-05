import { createReportSummaryRouteHandler } from "@/lib/api/reportSummaryRouteCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import CreditCard from "@/models/CreditCard";
import CalendarNote from "@/models/CalendarNote";

export const dynamic = "force-dynamic";

export const GET = createReportSummaryRouteHandler({
  connectToDatabase,
  CardModel: CreditCard,
  CalendarNoteModel: CalendarNote,
});
