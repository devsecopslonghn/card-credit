import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errorsCore.mjs";
import { assertAdmin, requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import Bank from "@/models/Bank";

export const dynamic = "force-dynamic"; 

export async function GET(request: Request) {
  try {
    requireAuth(request);
    await connectToDatabase();
    // Sắp xếp theo tên viết tắt (A-Z) để dễ tìm kiếm
    const banks = await Bank.find().sort({ shortname: 1 });
    return NextResponse.json(banks);
  } catch (error) {
    return handleApiError("GET /api/banks failed", error);
  }
}

export async function POST(request: Request) {
  try {
    assertAdmin(requireAuth(request));
    await connectToDatabase();
    const data = await request.json();

    // Kiểm tra xem shortname đã tồn tại chưa (không phân biệt hoa thường)
    const isExisting = await Bank.findOne({
      shortname: { $regex: new RegExp(`^${data.shortname.trim()}$`, "i") },
    });

    if (isExisting) {
      return NextResponse.json(
        { message: `Ngân hàng có mã viết tắt ${data.shortname} đã tồn tại trong hệ thống.` },
        { status: 400 }
      );
    }

    const newBank = await Bank.create(data);
    return NextResponse.json(newBank, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) return handleApiError("POST /api/banks failed", error);
    return NextResponse.json({ message: "Lỗi máy chủ nội bộ" }, { status: 500 });
  }
}
