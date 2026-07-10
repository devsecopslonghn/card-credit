import { createForgotPasswordRouteHandler } from "@/lib/api/authAccountRouteCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import AuthAuditLog from "@/models/AuthAuditLog";
import PasswordResetToken from "@/models/PasswordResetToken";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export const POST = createForgotPasswordRouteHandler({
  connectToDatabase,
  UserModel: User,
  PasswordResetTokenModel: PasswordResetToken,
  AuditLogModel: AuthAuditLog,
});
