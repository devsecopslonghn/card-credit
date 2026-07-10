import { createLoginRouteHandler } from "@/lib/api/authRouteCore.mjs";
import {
  authenticateCredentials,
  authCookieOptions,
  AUTH_COOKIE_NAME,
  createSessionCookieValue,
} from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import AuthAuditLog from "@/models/AuthAuditLog";
import User from "@/models/User";

export const POST = createLoginRouteHandler({
  authenticateCredentials,
  createSessionCookieValue,
  authCookieName: AUTH_COOKIE_NAME,
  authCookieOptions,
  connectToDatabase,
  UserModel: User,
  AuditLogModel: AuthAuditLog,
});
