import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errorsCore.mjs";
import { assertAdmin, requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import CardType from "@/models/CardType";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    assertAdmin(requireAuth(request));
    await connectToDatabase();
    const { id } = await context.params;
    const data = await request.json();
    
    const updatedCardType = await CardType.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    return NextResponse.json(updatedCardType);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) return handleApiError("PUT /api/cardtypes/:id failed", error);
    return NextResponse.json({ message: "Lỗi khi cập nhật loại thẻ" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertAdmin(requireAuth(request));
    await connectToDatabase();
    const { id } = await context.params;
    await CardType.findByIdAndDelete(id);
    return NextResponse.json({ message: "Đã xóa loại thẻ thành công" });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) return handleApiError("DELETE /api/cardtypes/:id failed", error);
    return NextResponse.json({ message: "Lỗi khi xóa loại thẻ" }, { status: 500 });
  }
}
