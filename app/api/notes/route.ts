import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errorsCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import CalendarNote from "@/models/CalendarNote";

export const dynamic = "force-dynamic";

// Lấy toàn bộ ghi chú lịch lịch trình
export async function GET(request: Request) {
  try {
    const session = requireAuth(request);
    await connectToDatabase();
    const notes = await CalendarNote.find({ workspaceId: session.workspaceId });
    return NextResponse.json(notes);
  } catch (error) {
    return handleApiError("GET /api/notes failed", error);
  }
}

// Thêm mới hoặc cập nhật Note (Upsert)
export async function POST(request: Request) {
  try {
    const session = requireAuth(request);
    await connectToDatabase();
    const { date, content } = await request.json();

    if (!date) {
      return NextResponse.json({ message: "Thiếu thông tin ngày!" }, { status: 400 });
    }

    // Nếu người dùng xóa hết chữ, chúng ta xóa luôn bản ghi đó cho sạch DB
    if (!content.trim()) {
      await CalendarNote.deleteOne({ workspaceId: session.workspaceId, date });
      return NextResponse.json({ message: "Đã xóa ghi chú trống" });
    }

    const updatedNote = await CalendarNote.findOneAndUpdate(
      { workspaceId: session.workspaceId, date },
      { workspaceId: session.workspaceId, content: content.trim() },
      { new: true, upsert: true, returnDocument: "after" },
    );

    return NextResponse.json(updatedNote);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error) return handleApiError("POST /api/notes failed", error);
    const message = error instanceof Error ? error.message : "Lỗi xử lý server";
    return NextResponse.json({ message }, { status: 500 });
  }
}
