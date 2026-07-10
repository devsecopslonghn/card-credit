import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errorsCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";

export async function GET(request: Request) {
  try {
    const session = requireAuth(request);
    return NextResponse.json({
      user: {
        email: session.email,
        role: session.role,
        workspaceId: session.workspaceId,
      },
    });
  } catch (error) {
    return handleApiError("GET /api/auth/me failed", error);
  }
}
