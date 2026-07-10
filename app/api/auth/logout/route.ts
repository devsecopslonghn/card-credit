import { createLogoutRouteHandler } from "@/lib/api/authRouteCore.mjs";
import { authCookieOptions, AUTH_COOKIE_NAME, requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import AuthAuditLog from "@/models/AuthAuditLog";

export const POST = createLogoutRouteHandler({
  authCookieName: AUTH_COOKIE_NAME,
  authCookieOptions,
  requireAuth,
  connectToDatabase,
  AuditLogModel: AuthAuditLog,
});
