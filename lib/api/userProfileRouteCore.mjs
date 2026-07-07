import { NextResponse } from "next/server.js";
import { canManageUsers } from "../auth/rbacCore.mjs";
import { ApiError, handleApiError, parseJsonRequest } from "./errorsCore.mjs";

export const USER_ROLES = new Set(["admin", "user"]);
export const MAX_DISPLAY_NAME_LENGTH = 80;
export const MAX_WORKSPACE_ID_LENGTH = 80;

export const normalizeDisplayName = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_DISPLAY_NAME", "Tên hiển thị không hợp lệ.", {
      displayName: "Tên hiển thị phải là chuỗi.",
    });
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new ApiError(400, "INVALID_DISPLAY_NAME", "Tên hiển thị không hợp lệ.", {
      displayName: `Tên hiển thị tối đa ${MAX_DISPLAY_NAME_LENGTH} ký tự.`,
    });
  }
  return normalized;
};

const normalizeWorkspaceId = (value) => {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_WORKSPACE", "Workspace không hợp lệ.", {
      workspaceId: "Workspace phải là chuỗi.",
    });
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_WORKSPACE_ID_LENGTH) {
    throw new ApiError(400, "INVALID_WORKSPACE", "Workspace không hợp lệ.", {
      workspaceId: `Workspace phải có từ 1 đến ${MAX_WORKSPACE_ID_LENGTH} ký tự.`,
    });
  }
  return normalized;
};

const serializeUser = (user) => ({
  id: user._id?.toString?.() ?? user.id,
  email: user.email,
  role: user.role === "admin" ? "admin" : "user",
  workspaceId: user.workspaceId,
  displayName: user.displayName ?? "",
  active: user.active !== false,
  lockedAt: user.lockedAt ?? null,
});

const requireUser = async (UserModel, userId) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
  return user;
};

export const createProfileRouteHandlers = ({ connectToDatabase, UserModel, requireAuth }) => ({
  async GET(request) {
    try {
      const session = requireAuth(request);
      await connectToDatabase();
      const user = await requireUser(UserModel, session.userId);
      return NextResponse.json({ user: serializeUser(user) });
    } catch (error) {
      return handleApiError("GET /api/profile failed", error);
    }
  },

  async PATCH(request) {
    try {
      const session = requireAuth(request);
      await connectToDatabase();
      const body = await parseJsonRequest(request);
      const forbiddenFields = ["role", "workspaceId", "email", "active", "lockedAt"].filter((field) => field in body);
      if (forbiddenFields.length > 0) {
        throw new ApiError(403, "FORBIDDEN_PROFILE_FIELD", "Bạn không có quyền cập nhật field này.", {
          fields: forbiddenFields.join(", "),
        });
      }
      if (!("displayName" in body)) {
        throw new ApiError(400, "INVALID_REQUEST", "Không có field hồ sơ hợp lệ để cập nhật.");
      }

      const updated = await UserModel.findByIdAndUpdate(
        session.userId,
        { displayName: normalizeDisplayName(body.displayName) },
        { new: true, runValidators: true },
      );
      if (!updated) throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
      return NextResponse.json({ user: serializeUser(updated) });
    } catch (error) {
      return handleApiError("PATCH /api/profile failed", error);
    }
  },
});

export const createAdminUsersRouteHandlers = ({ connectToDatabase, UserModel, requireAuth }) => ({
  async GET(request) {
    try {
      const session = requireAuth(request);
      if (!canManageUsers(session)) {
        throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền quản lý người dùng.");
      }
      await connectToDatabase();
      const users = await UserModel.find().sort({ email: 1 }).lean();
      return NextResponse.json({ users: users.map(serializeUser) });
    } catch (error) {
      return handleApiError("GET /api/admin/users failed", error);
    }
  },

  async PATCH(request, context) {
    try {
      const session = requireAuth(request);
      if (!canManageUsers(session)) {
        throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền quản lý người dùng.");
      }
      await connectToDatabase();
      const { id } = await context.params;
      const body = await parseJsonRequest(request);
      const update = {};

      if ("displayName" in body) update.displayName = normalizeDisplayName(body.displayName);
      if ("role" in body) {
        if (!USER_ROLES.has(body.role)) {
          throw new ApiError(400, "INVALID_ROLE", "Role không hợp lệ.", {
            role: "Role chỉ có thể là admin hoặc user.",
          });
        }
        update.role = body.role;
      }
      if ("workspaceId" in body) update.workspaceId = normalizeWorkspaceId(body.workspaceId);

      const forbiddenFields = Object.keys(body).filter(
        (field) => !["displayName", "role", "workspaceId"].includes(field),
      );
      if (forbiddenFields.length > 0) {
        throw new ApiError(400, "FORBIDDEN_UPDATE_FIELD", "Không được cập nhật field này.", {
          fields: forbiddenFields.join(", "),
        });
      }
      if (Object.keys(update).length === 0) {
        throw new ApiError(400, "INVALID_REQUEST", "Không có field người dùng hợp lệ để cập nhật.");
      }

      const updated = await UserModel.findByIdAndUpdate(id, update, { new: true, runValidators: true });
      if (!updated) throw new ApiError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
      return NextResponse.json({ user: serializeUser(updated) });
    } catch (error) {
      return handleApiError("PATCH /api/admin/users/:id failed", error);
    }
  },
});
