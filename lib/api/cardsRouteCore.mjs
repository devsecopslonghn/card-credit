import mongoose from "mongoose";
import { NextResponse } from "next/server.js";
import { serializeCreditCard, serializeCreditCards } from "../cards/serializerCore.mjs";
import { createCardFromRequestBody, updateCardById } from "../services/cardService.mjs";
import { ApiError, handleApiError, parseJsonRequest } from "./errorsCore.mjs";

export const createCardsRouteHandlers = ({ connectToDatabase, CardModel }) => ({
  async GET() {
    try {
      await connectToDatabase();
      const cards = await CardModel.find().sort({ createdAt: -1 });
      return NextResponse.json(serializeCreditCards(cards));
    } catch (error) {
      return handleApiError("GET /api/cards failed", error);
    }
  },

  async POST(request) {
    try {
      await connectToDatabase();
      const body = await parseJsonRequest(request);
      const { card, deprecatedLegacy } = await createCardFromRequestBody(body, { CardModel });

      const response = NextResponse.json(serializeCreditCard(card), { status: 201 });
      if (deprecatedLegacy) response.headers.set("X-Deprecated-Contract", "legacy-card-create");
      return response;
    } catch (error) {
      return handleApiError("POST /api/cards failed", error);
    }
  },
});

export const createCardDetailRouteHandlers = ({ connectToDatabase, CardModel }) => ({
  async GET(_request, context) {
    try {
      await connectToDatabase();
      const { id } = await context.params;
      if (!mongoose.isValidObjectId(id)) {
        throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
      }

      const card = await CardModel.findById(id);
      if (!card) {
        throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
      }

      return NextResponse.json(serializeCreditCard(card));
    } catch (error) {
      return handleApiError("GET /api/cards/:id failed", error);
    }
  },

  async PUT(request, context) {
    try {
      await connectToDatabase();
      const { id } = await context.params;
      const data = await parseJsonRequest(request);
      const updatedCard = await updateCardById(id, data, { CardModel });

      return NextResponse.json(serializeCreditCard(updatedCard));
    } catch (error) {
      return handleApiError("PUT /api/cards/:id failed", error);
    }
  },

  async DELETE(_request, context) {
    try {
      await connectToDatabase();
      const { id } = await context.params;
      if (!mongoose.isValidObjectId(id)) {
        throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
      }

      const deletedCard = await CardModel.findByIdAndDelete(id);
      if (!deletedCard) {
        throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
      }

      return NextResponse.json({ message: "Đã xóa thẻ thành công" });
    } catch (error) {
      return handleApiError("DELETE /api/cards/:id failed", error);
    }
  },
});
