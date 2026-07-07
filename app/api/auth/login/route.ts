import { createLoginRouteHandler } from "@/lib/api/authRouteCore.mjs";
import { authenticateCredentials, AUTH_COOKIE_NAME, createSessionCookieValue } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import AuthAuditLog from "@/models/AuthAuditLog";
import User from "@/models/User";

export const POST = createLoginRouteHandler({
  authenticateCredentials,
  createSessionCookieValue,
  authCookieName: AUTH_COOKIE_NAME,
  connectToDatabase,
  UserModel: User,
  AuditLogModel: AuthAuditLog,
});
