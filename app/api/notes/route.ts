import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CalendarNote from "@/models/CalendarNote";

export const dynamic = "force-dynamic";

// Lấy toàn bộ ghi chú lịch lịch trình
export async function GET() {
  await connectToDatabase();
  const notes = await CalendarNote.find();
  return NextResponse.json(notes);
}

// Thêm mới hoặc cập nhật Note (Upsert)
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { date, content } = await request.json();

    if (!date) {
      return NextResponse.json({ message: "Thiếu thông tin ngày!" }, { status: 400 });
    }

    // Nếu người dùng xóa hết chữ, chúng ta xóa luôn bản ghi đó cho sạch DB
    if (!content.trim()) {
      await CalendarNote.deleteOne({ date });
      return NextResponse.json({ message: "Đã xóa ghi chú trống" });
    }

    const updatedNote = await CalendarNote.findOneAndUpdate(
      { date },
      { content: content.trim() },
      { new: true, upsert: true, returnDocument: "after" },
    );

    return NextResponse.json(updatedNote);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi xử lý server";
    return NextResponse.json({ message }, { status: 500 });
  }
}
