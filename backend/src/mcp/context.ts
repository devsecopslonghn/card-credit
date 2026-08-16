import type { ServiceContext } from "../services/types/service-context.js";
import { mcpServiceContext } from "../context.js";
import type { AuthRepository } from "../auth-repository.js";
import { ApiError } from "../errors.js";

export const fixedMcpContext = (): ServiceContext => {
  const workspaceId = process.env.MCP_WORKSPACE_ID?.trim();
  const userId = process.env.MCP_USER_ID?.trim();
  if (!workspaceId || !userId) throw new Error("MCP_WORKSPACE_ID and MCP_USER_ID are required");
  return mcpServiceContext({ workspaceId, userId, role: "user" });
};

export const revalidateMcpContext = async (
  context: ServiceContext,
  users: Pick<AuthRepository, "findUserById">,
): Promise<ServiceContext> => {
  let user;
  try { user = await users.findUserById(context.userId); } catch { user = null; }
  if (!user || !user.active || user.lockedAt || user.workspaceId !== context.workspaceId) {
    throw new ApiError(401, "MCP_CONTEXT_INVALID", "MCP identity không còn hợp lệ.");
  }
  return mcpServiceContext({ userId: user.id, workspaceId: user.workspaceId, role: user.role });
};
