import type { ServiceContext } from "../services/types/service-context.js";

export const fixedMcpContext = (): ServiceContext => {
  const workspaceId = process.env.MCP_WORKSPACE_ID?.trim();
  const userId = process.env.MCP_USER_ID?.trim();
  if (!workspaceId || !userId) throw new Error("MCP_WORKSPACE_ID and MCP_USER_ID are required");
  return { workspaceId, userId, role: "user" };
};
