import mongoose from "mongoose";

type Data = Record<string, unknown>;
type AuditFilters = { event?: string; userId?: string; email?: string; resourceType?: string; resourceId?: string; limit?: string };

export type AuditLogRepository = {
  list(query: Data, limit: number): Promise<Data[]>;
};

const auditLogRepository: AuditLogRepository = {
  list: async (query, limit) => mongoose.connection.collection("authauditlogs").find(query).sort({ createdAt: -1 }).limit(limit).toArray() as Promise<Data[]>,
};

const boundedLimit = (value: unknown) => Math.min(Math.max(Number.parseInt(typeof value === "string" ? value : "50", 10) || 50, 1), 100);

export class AdminAuditService {
  static async list(filters: AuditFilters, repository: AuditLogRepository = auditLogRepository) {
    const limit = boundedLimit(filters.limit);
    const query: Data = {};
    if (filters.event) query.event = filters.event;
    if (filters.userId) query.userId = filters.userId;
    if (filters.email) query.email = filters.email.trim().toLowerCase();
    if (filters.resourceType) query["resource.type"] = filters.resourceType;
    if (filters.resourceId) query["resource.id"] = filters.resourceId;
    const logs = await repository.list(query, limit);
    return { logs: logs.map(({ _id, ...log }) => ({ id: String(_id), ...log })), filters: query, limit };
  }
}
