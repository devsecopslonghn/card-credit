export const canManageCatalog = (session) => session?.role === "admin";

export const canManageUsers = (session) => session?.role === "admin";

export const canReadWorkspace = (session, workspaceId) =>
  Boolean(session?.workspaceId && workspaceId && session.workspaceId === workspaceId);
