import { createRegisterRouteHandler } from "@/lib/api/authAccountRouteCore.mjs";
import {
  authenticateCredentials,
  authCookieOptions,
  AUTH_COOKIE_NAME,
  createSessionCookieValue,
} from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import AuthAuditLog from "@/models/AuthAuditLog";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export const POST = createRegisterRouteHandler({
  connectToDatabase,
  UserModel: User,
  authenticateCredentials,
  createSessionCookieValue,
  authCookieName: AUTH_COOKIE_NAME,
  authCookieOptions,
  AuditLogModel: AuthAuditLog,
});
