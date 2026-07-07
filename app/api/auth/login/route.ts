import { NextResponse } from "next/server";
import { authenticateCredentials, AUTH_COOKIE_NAME, createSessionCookieValue } from "@/lib/auth/sessionCore.mjs";
import { handleApiError, parseJsonRequest } from "@/lib/api/errorsCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    await connectToDatabase();
    const session = await authenticateCredentials({ email: body.email, password: body.password }, { UserModel: User });
    const response = NextResponse.json({
      user: {
        email: session.email,
        role: session.role,
        workspaceId: session.workspaceId,
      },
    });
    response.cookies.set(AUTH_COOKIE_NAME, createSessionCookieValue(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch (error) {
    return handleApiError("POST /api/auth/login failed", error);
  }
}
