import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { handleApiError, ApiError, parseJsonRequest } from "@/lib/api/errors";
import { serializeCreditCard } from "@/lib/cards/serializer";
import { connectToDatabase } from "@/lib/mongodb";
import { updateCardById } from "@/lib/services/cardService.mjs";
import CreditCard from "@/models/CreditCard";

// Định nghĩa kiểu dữ liệu cho context chứa params (kiểu Promise)
type RouteContext = {
  params: Promise<{ id: string }>;
};

// Cập nhật thẻ (Update)
export async function PUT(request: Request, context: RouteContext) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    const data = await parseJsonRequest(request);
    const updatedCard = await updateCardById(id, data, { CardModel: CreditCard });

    return NextResponse.json(serializeCreditCard(updatedCard));
  } catch (error) {
    return handleApiError("PUT /api/cards/:id failed", error);
  }
}

// Xóa thẻ (Delete)
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await connectToDatabase();

    // Bắt buộc phải await params trước khi lấy id
    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new ApiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
    }

    const deletedCard = await CreditCard.findByIdAndDelete(id);
    if (!deletedCard) {
      throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
    }

    return NextResponse.json({ message: "Đã xóa thẻ thành công" });
  } catch (error) {
    return handleApiError("DELETE /api/cards/:id failed", error);
  }
}
