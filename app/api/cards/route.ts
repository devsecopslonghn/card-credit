import { NextResponse } from "next/server";
import { handleApiError, parseJsonRequest } from "@/lib/api/errors";
import { serializeCreditCard, serializeCreditCards } from "@/lib/cards/serializer";
import { connectToDatabase } from "@/lib/mongodb";
import { createCardFromRequestBody } from "@/lib/services/cardService.mjs";
import CreditCard from "@/models/CreditCard";

// Khai báo dòng này để báo cho Next.js biết đây là API động, không được lưu cache
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();
    const cards = await CreditCard.find().sort({ createdAt: -1 });
    return NextResponse.json(serializeCreditCards(cards));
  } catch (error) {
    return handleApiError("GET /api/cards failed", error);
  }
}

// Thêm thẻ mới (Create)
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await parseJsonRequest(request);
    const { card, deprecatedLegacy } = await createCardFromRequestBody(body, { CardModel: CreditCard });

    const response = NextResponse.json(serializeCreditCard(card), { status: 201 });
    if (deprecatedLegacy) response.headers.set("X-Deprecated-Contract", "legacy-card-create");
    return response;
  } catch (error) {
    return handleApiError("POST /api/cards failed", error);
  }
}
