import { createAuditLogsRouteHandler } from "@/lib/api/auditLogsRouteCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import AuthAuditLog from "@/models/AuthAuditLog";

export const dynamic = "force-dynamic";

export const GET = createAuditLogsRouteHandler({
  connectToDatabase,
  AuditLogModel: AuthAuditLog,
  requireAuth,
});
