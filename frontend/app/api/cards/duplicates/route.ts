import { createCardDuplicateRouteHandlers } from "@/lib/api/cardsRouteCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import CreditCard from "@/models/CreditCard";

export const dynamic = "force-dynamic";

const handlers = createCardDuplicateRouteHandlers({
  connectToDatabase,
  CardModel: CreditCard,
  requireAuth,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
