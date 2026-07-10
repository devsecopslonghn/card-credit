import { NextResponse } from "next/server.js";
import { canManageUsers } from "../auth/rbacCore.mjs";
import { ApiError, handleApiError } from "./errorsCore.mjs";

const cappedLimit = (value) => {
  const parsed = Number.parseInt(value ?? "50", 10);
  if (Number.isNaN(parsed) || parsed < 1) return 50;
  return Math.min(parsed, 100);
};

const auditQueryFrom = (request) => {
  const url = new URL(request.url);
  const query = {};
  const event = url.searchParams.get("event");
  const userId = url.searchParams.get("userId");
  const email = url.searchParams.get("email");
  const resourceType = url.searchParams.get("resourceType");
  const resourceId = url.searchParams.get("resourceId");

  if (event) query.event = event;
  if (userId) query.userId = userId;
  if (email) query.email = email.trim().toLowerCase();
  if (resourceType) query["resource.type"] = resourceType;
  if (resourceId) query["resource.id"] = resourceId;

  return { query, limit: cappedLimit(url.searchParams.get("limit")) };
};

const serializeLog = (log) => ({
  id: log._id?.toString?.() ?? log.id,
  event: log.event,
  userId: log.userId ?? null,
  email: log.email ?? null,
  role: log.role ?? null,
  workspaceId: log.workspaceId ?? null,
  ip: log.ip ?? null,
  userAgent: log.userAgent ?? null,
  correlationId: log.correlationId ?? null,
  resource: log.resource ?? null,
  createdAt: log.createdAt ?? null,
});

export const createAuditLogsRouteHandler = ({ connectToDatabase, AuditLogModel, requireAuth }) => async function GET(request) {
  try {
    const session = requireAuth(request);
    if (!canManageUsers(session)) {
      throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền xem audit log.");
    }
    await connectToDatabase();
    const { query, limit } = auditQueryFrom(request);
    const logs = await AuditLogModel.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return NextResponse.json({ logs: logs.map(serializeLog), filters: query, limit });
  } catch (error) {
    return handleApiError("GET /api/admin/audit-logs failed", error);
  }
};
