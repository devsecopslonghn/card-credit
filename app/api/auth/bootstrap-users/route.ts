import { createBootstrapUsersRouteHandler } from "@/lib/api/authAccountRouteCore.mjs";
import { getConfiguredUsers } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import AuthAuditLog from "@/models/AuthAuditLog";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export const POST = createBootstrapUsersRouteHandler({
  connectToDatabase,
  UserModel: User,
  getConfiguredUsers,
  AuditLogModel: AuthAuditLog,
});
