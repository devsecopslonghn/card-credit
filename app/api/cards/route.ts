import { createCardsRouteHandlers } from "@/lib/api/cardsRouteCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import CreditCard from "@/models/CreditCard";

// Khai báo dòng này để báo cho Next.js biết đây là API động, không được lưu cache
export const dynamic = "force-dynamic";

const handlers = createCardsRouteHandlers({ connectToDatabase, CardModel: CreditCard });

export const GET = handlers.GET;
export const POST = handlers.POST;
