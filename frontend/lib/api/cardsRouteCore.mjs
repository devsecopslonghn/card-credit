import mongoose from "mongoose";
import { NextResponse } from "next/server.js";
import { serializeCreditCard, serializeCreditCards } from "../cards/serializerCore.mjs";
import {
  createCardFromRequestBody,
  findDuplicateCards,
  mergeDuplicateCards,
  updateCardById,
} from "../services/cardService.mjs";
import { ApiError, handleApiError, parseJsonRequest } from "./errorsCore.mjs";
import { errorContext, logError } from "../observability/logger.mjs";

const sessionFrom = (requireAuth, request) => (requireAuth ? requireAuth(request) : null);
const workspaceQuery = (session, extra = {}) => (session ? { ...extra, workspaceId: session.workspaceId } : extra);

const assertReadableCard = (card, session) => {
  if (!card || (session && card.workspaceId !== session.workspaceId)) {
    throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
  }
  return card;
};

export const createCardsRouteHandlers = ({ connectToDatabase, CardModel, requireAuth }) => ({
  async GET(request) {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const cards = await CardModel.find(workspaceQuery(session)).sort({ createdAt: -1 });
      return NextResponse.json(serializeCreditCards(cards));
    } catch (error) {
      return handleApiError("GET /api/cards failed", error);
    }
  },

  async POST(request) {
    let presetId;
    try {
      await connectToDatabase();
      const session = sessionFrom(requireAuth, request);
      const body = await parseJsonRequest(request);
      presetId = typeof body.presetId === "string" ? body.presetId : undefined;
      const { card, deprecatedLegacy } = await createCardFromRequestBody(body, { CardModel, session });

      const response = NextResponse.json(serializeCreditCard(card), { status: 201 });
      if (deprecatedLegacy) response.headers.set("X-Deprecated-Contract", "legacy-card-create");
      return response;
    } catch (error) {
      logError("CARD_CREATE_FAILURE", {
        presetId,
        ...errorContext(error),
      });
      return handleApiError("POST /api/cards failed", error);
    }
  },
});

export const createCardDetailRouteHandlers = ({ connectToDatabase, CardModel, requireAuth }) => ({
  async GET(request, context) {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const { id } = await context.params;
      if (!mongoose.isValidObjectId(id)) {
        throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
      }

      const card = await CardModel.findById(id);
      assertReadableCard(card, session);

      return NextResponse.json(serializeCreditCard(card));
    } catch (error) {
      return handleApiError("GET /api/cards/:id failed", error);
    }
  },

  async PUT(request, context) {
    try {
      await connectToDatabase();
      const session = sessionFrom(requireAuth, request);
      const { id } = await context.params;
      if (!mongoose.isValidObjectId(id)) {
        throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
      }

      assertReadableCard(await CardModel.findById(id), session);
      const data = await parseJsonRequest(request);
      const updatedCard = await updateCardById(id, data, { CardModel });

      return NextResponse.json(serializeCreditCard(updatedCard));
    } catch (error) {
      return handleApiError("PUT /api/cards/:id failed", error);
    }
  },

  async DELETE(request, context) {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const { id } = await context.params;
      if (!mongoose.isValidObjectId(id)) {
        throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
      }

      assertReadableCard(await CardModel.findById(id), session);
      const deletedCard = await CardModel.findByIdAndDelete(id);
      assertReadableCard(deletedCard, session);

      return NextResponse.json({ message: "Đã xóa thẻ thành công" });
    } catch (error) {
      return handleApiError("DELETE /api/cards/:id failed", error);
    }
  },
});

export const createCardDuplicateRouteHandlers = ({ connectToDatabase, CardModel, requireAuth }) => ({
  async GET(request) {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const groups = await findDuplicateCards({ CardModel, session });
      return NextResponse.json({
        data: groups.map((group) => ({
          ...group,
          cards: serializeCreditCards(group.cards),
        })),
      });
    } catch (error) {
      return handleApiError("GET /api/cards/duplicates failed", error);
    }
  },

  async POST(request) {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const body = await parseJsonRequest(request);
      const result = await mergeDuplicateCards(body, { CardModel, session });
      return NextResponse.json({
        data: {
          targetCard: serializeCreditCard(result.targetCard),
          deletedSourceId: result.deletedSourceId,
          merge: result.merge,
        },
      });
    } catch (error) {
      return handleApiError("POST /api/cards/duplicates failed", error);
    }
  },
});
