import { createCardDetailRouteHandlers } from "@/lib/api/cardsRouteCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import CreditCard from "@/models/CreditCard";

const handlers = createCardDetailRouteHandlers({ connectToDatabase, CardModel: CreditCard });

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
