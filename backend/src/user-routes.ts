import type { FastifyInstance, FastifyRequest } from "fastify";
import { ApiError } from "./errors.js";
import type { AuthRepository, AuthUser } from "./auth-repository.js";
import { browserServiceContext } from "./context.js";
import { AdminAuditService } from "./services/admin-audit-service.js";
import { AdminUserService } from "./services/admin-user-service.js";
import { userListSchema, userSchema } from "@card-credit/contracts";

const serialize = (user: AuthUser) => ({ id: user.id, email: user.email, role: user.role, workspaceId: user.workspaceId, displayName: user.displayName, active: user.active, lockedAt: user.lockedAt instanceof Date ? user.lockedAt.toISOString() : user.lockedAt ?? null });
const displayName = (value: unknown) => { if (typeof value !== "string") throw new ApiError(400, "INVALID_DISPLAY_NAME", "Tên hiển thị không hợp lệ.", { displayName: "Tên hiển thị phải là chuỗi." }); const normalized = value.trim().replace(/\s+/g, " "); if (normalized.length > 80) throw new ApiError(400, "INVALID_DISPLAY_NAME", "Tên hiển thị không hợp lệ.", { displayName: "Tên hiển thị tối đa 80 ký tự." }); return normalized; };
export const registerUserRoutes = (app: FastifyInstance, users: AuthRepository, secret: string) => {
  const adminContext = async (request: FastifyRequest) => { const context = await browserServiceContext(request, secret, users); if (context.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này."); return context; };
  app.get("/api/profile", async (request) => { const context = await browserServiceContext(request, secret, users); const user = await users.findUserById(context.userId); if (!user) throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng."); return { user: userSchema.parse(serialize(user)) }; });
  app.patch<{ Body: Record<string, unknown> }>("/api/profile", async (request) => { const context = await browserServiceContext(request, secret, users); const forbidden = ["role", "workspaceId", "email", "active", "lockedAt"].filter((field) => field in (request.body ?? {})); if (forbidden.length) throw new ApiError(403, "FORBIDDEN_PROFILE_FIELD", "Bạn không có quyền cập nhật field này.", { fields: forbidden.join(", ") }); if (!("displayName" in (request.body ?? {}))) throw new ApiError(400, "INVALID_REQUEST", "Không có field hồ sơ hợp lệ để cập nhật."); const user = await users.updateUser(context.userId, { displayName: displayName(request.body.displayName) }); if (!user) throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng."); return { user: userSchema.parse(serialize(user)) }; });
  app.get("/api/admin/users", async (request) => { const context = await adminContext(request); return { users: userListSchema.parse((await AdminUserService.list(context, users)).map(serialize)) }; });
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>("/api/admin/users/:id", async (request) => { const context = await adminContext(request); const user = await AdminUserService.update(context, request.params.id, request.body ?? {}, users); if (!user) throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng."); return { user: userSchema.parse(serialize(user)) }; });
  app.get<{ Querystring: { event?: string; userId?: string; email?: string; resourceType?: string; resourceId?: string; limit?: string } }>("/api/admin/audit-logs", async (request) => { await adminContext(request); return AdminAuditService.list(request.query); });
};
