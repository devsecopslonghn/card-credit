import type { FastifyInstance } from "fastify";
import { requireAdmin } from "./auth.js";
import type { AuthRepository } from "./auth-repository.js";
import { browserServiceContext } from "./context.js";
import { ApiError } from "./errors.js";
import { WorkspaceModel } from "./models/workspace.js";

export const registerWorkspaceRoutes = (app: FastifyInstance, users: AuthRepository, secret: string) => {
  app.get("/api/workspace/owner", async (request) => { const context = await browserServiceContext(request, secret, users); const workspace = await WorkspaceModel.findOne({ workspaceId: context.workspaceId }); return { data: { configured: Boolean(workspace?.get("ownerUserId")) } }; });
  app.put<{ Body: { ownerUserId?: unknown } }>("/api/workspace/owner", async (request) => {
    const session = requireAdmin(request, secret); const ownerUserId = request.body?.ownerUserId;
    if (typeof ownerUserId !== "string") throw new ApiError(400, "INVALID_WORKSPACE_OWNER", "Owner workspace không hợp lệ.");
    const user = await users.findUserById(ownerUserId);
    if (!user || user.workspaceId !== session.workspaceId || !user.active || user.lockedAt) throw new ApiError(400, "INVALID_WORKSPACE_OWNER", "Owner workspace không hợp lệ.");
    await WorkspaceModel.updateOne({ workspaceId: session.workspaceId }, { $set: { ownerUserId, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    return { data: { configured: true } };
  });
};
