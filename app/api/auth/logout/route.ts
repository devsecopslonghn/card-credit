import { createLogoutRouteHandler } from "@/lib/api/authRouteCore.mjs";
import { AUTH_COOKIE_NAME, requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import AuthAuditLog from "@/models/AuthAuditLog";

export const POST = createLogoutRouteHandler({
  authCookieName: AUTH_COOKIE_NAME,
  requireAuth,
  connectToDatabase,
  AuditLogModel: AuthAuditLog,
});
