import { NextResponse } from "next/server.js";
import { logAuthEvent } from "../audit/logAuthEventCore.mjs";
import { handleApiError, parseJsonRequest } from "./errorsCore.mjs";

const normalizedEmailFrom = (value) => (typeof value === "string" ? value.trim().toLowerCase() : null);

export const createLoginRouteHandler = ({
  authenticateCredentials,
  createSessionCookieValue,
  authCookieName,
  connectToDatabase,
  UserModel,
  AuditLogModel,
}) => async function POST(request) {
  let email = null;
  let databaseConnected = false;
  try {
    const body = await parseJsonRequest(request);
    email = normalizedEmailFrom(body.email);
    await connectToDatabase();
    databaseConnected = true;
    const session = await authenticateCredentials({ email: body.email, password: body.password }, { UserModel });
    await logAuthEvent({
      AuditLogModel,
      event: "LOGIN_SUCCESS",
      request,
      actor: session,
      resource: { type: "auth", action: "login" },
    });

    const response = NextResponse.json({
      user: {
        email: session.email,
        role: session.role,
        workspaceId: session.workspaceId,
      },
    });
    response.cookies.set(authCookieName, createSessionCookieValue(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch (error) {
    if (!databaseConnected) {
      await connectToDatabase();
    }
    await logAuthEvent({
      AuditLogModel,
      event: "LOGIN_FAILURE",
      request,
      email,
      resource: {
        type: "auth",
        action: "login",
        errorCode: error?.code ?? "UNKNOWN",
      },
    });
    return handleApiError("POST /api/auth/login failed", error);
  }
};

export const createLogoutRouteHandler = ({
  authCookieName,
  requireAuth,
  connectToDatabase,
  AuditLogModel,
}) => async function POST(request) {
  let session = null;
  try {
    session = requireAuth ? requireAuth(request) : null;
  } catch {
    session = null;
  }

  if (connectToDatabase) await connectToDatabase();
  await logAuthEvent({
    AuditLogModel,
    event: "LOGOUT",
    request,
    actor: session,
    resource: { type: "auth", action: "logout" },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
};
