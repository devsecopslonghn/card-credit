import { ApiError } from "../errors.js";
import type { AuthRepository, AuthUser } from "../auth-repository.js";
import type { ServiceContext } from "./types/service-context.js";

type UpdateBody = Record<string, unknown>;
type UserUpdate = Partial<Pick<AuthUser, "displayName" | "role" | "workspaceId">>;

const requireAdmin = (context: ServiceContext) => {
  if (context.role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
  }
};

const normalizeDisplayName = (value: unknown) => {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_DISPLAY_NAME", "Tên hiển thị không hợp lệ.", {
      displayName: "Tên hiển thị phải là chuỗi.",
    });
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length > 80) {
    throw new ApiError(400, "INVALID_DISPLAY_NAME", "Tên hiển thị không hợp lệ.", {
      displayName: "Tên hiển thị tối đa 80 ký tự.",
    });
  }
  return normalized;
};

const normalizeUpdate = (body: UpdateBody): UserUpdate => {
  const forbidden = Object.keys(body).filter((field) => !["displayName", "role", "workspaceId"].includes(field));
  if (forbidden.length) {
    throw new ApiError(400, "FORBIDDEN_UPDATE_FIELD", "Không được cập nhật field này.", {
      fields: forbidden.join(", "),
    });
  }

  const update: UserUpdate = {};
  if ("displayName" in body) update.displayName = normalizeDisplayName(body.displayName);
  if ("role" in body) {
    if (body.role !== "admin" && body.role !== "user") {
      throw new ApiError(400, "INVALID_ROLE", "Role không hợp lệ.", {
        role: "Role chỉ có thể là admin hoặc user.",
      });
    }
    update.role = body.role;
  }
  if ("workspaceId" in body) {
    if (typeof body.workspaceId !== "string" || !body.workspaceId.trim() || body.workspaceId.trim().length > 80) {
      throw new ApiError(400, "INVALID_WORKSPACE", "Workspace không hợp lệ.");
    }
    update.workspaceId = body.workspaceId.trim();
  }
  if (!Object.keys(update).length) {
    throw new ApiError(400, "INVALID_REQUEST", "Không có field người dùng hợp lệ để cập nhật.");
  }
  return update;
};

export class AdminUserService {
  static async list(context: ServiceContext, users: Pick<AuthRepository, "listUsers">) {
    requireAdmin(context);
    return users.listUsers();
  }

  static async update(
    context: ServiceContext,
    userId: string,
    body: UpdateBody,
    users: Pick<AuthRepository, "updateUser">,
  ) {
    requireAdmin(context);
    return users.updateUser(userId, normalizeUpdate(body));
  }
}
