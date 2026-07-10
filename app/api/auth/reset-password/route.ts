import { createResetPasswordRouteHandler } from "@/lib/api/authAccountRouteCore.mjs";
import { AUTH_COOKIE_NAME } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import AuthAuditLog from "@/models/AuthAuditLog";
import PasswordResetToken from "@/models/PasswordResetToken";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export const POST = createResetPasswordRouteHandler({
  connectToDatabase,
  UserModel: User,
  PasswordResetTokenModel: PasswordResetToken,
  AuditLogModel: AuthAuditLog,
  authCookieName: AUTH_COOKIE_NAME,
});
