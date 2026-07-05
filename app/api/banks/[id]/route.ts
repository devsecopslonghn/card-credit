import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errorsCore.mjs";
import { assertAdmin, requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import Bank from "@/models/Bank";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    assertAdmin(requireAuth(request));
    await connectToDatabase();
    const { id } = await context.params;
    const data = await request.json();
    
    const updatedBank = await Bank.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    return NextResponse.json(updatedBank);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) return handleApiError("PUT /api/banks/:id failed", error);
    return NextResponse.json({ message: "Lỗi khi cập nhật ngân hàng" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertAdmin(requireAuth(request));
    await connectToDatabase();
    const { id } = await context.params;
    await Bank.findByIdAndDelete(id);
    return NextResponse.json({ message: "Đã xóa ngân hàng thành công" });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) return handleApiError("DELETE /api/banks/:id failed", error);
    return NextResponse.json({ message: "Lỗi khi xóa ngân hàng" }, { status: 500 });
  }
}
