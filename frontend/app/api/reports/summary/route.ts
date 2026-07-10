import { createReportSummaryRouteHandler } from "@/lib/api/reportSummaryRouteCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import CreditCard from "@/models/CreditCard";
import CalendarNote from "@/models/CalendarNote";
import CardStatement from "@/models/CardStatement";
import CardTransaction from "@/models/CardTransaction";

export const dynamic = "force-dynamic";

export const GET = createReportSummaryRouteHandler({
  connectToDatabase,
  CardModel: CreditCard,
  CalendarNoteModel: CalendarNote,
  TransactionModel: CardTransaction,
  CardStatementModel: CardStatement,
  requireAuth,
});
