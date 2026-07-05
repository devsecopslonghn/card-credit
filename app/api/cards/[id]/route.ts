import { createCardDetailRouteHandlers } from "@/lib/api/cardsRouteCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import CreditCard from "@/models/CreditCard";

const handlers = createCardDetailRouteHandlers({ connectToDatabase, CardModel: CreditCard, requireAuth });

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
