export const AUTH_AUDIT_EVENTS = new Set([
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "USER_BOOTSTRAPPED",
  "CATALOG_PRODUCT_CREATED",
  "CATALOG_PRODUCT_UPDATED",
  "CATALOG_PROVIDER_BULK_UPDATED",
]);

const SENSITIVE_KEY_PATTERN = /password|secret|token|cookie|authorization/i;

const headerValue = (request, name) => request?.headers?.get?.(name) ?? null;

export const auditRequestContext = (request) => {
  const forwardedFor = headerValue(request, "x-forwarded-for");
  return {
    ip: forwardedFor?.split(",")[0]?.trim() || headerValue(request, "x-real-ip") || null,
    userAgent: headerValue(request, "user-agent"),
    correlationId: headerValue(request, "x-correlation-id") || headerValue(request, "x-request-id") || null,
  };
};

export const sanitizeAuditResource = (value) => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(sanitizeAuditResource);
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeAuditResource(entryValue),
    ]),
  );
};

export const logAuthEvent = async ({
  AuditLogModel,
  event,
  request,
  actor,
  email,
  resource,
  correlationId,
}) => {
  if (!AUTH_AUDIT_EVENTS.has(event)) {
    throw new Error(`Unsupported audit event: ${event}`);
  }
  if (!AuditLogModel) return null;

  const context = auditRequestContext(request);
  const record = {
    event,
    userId: actor?.userId ?? null,
    email: email ?? actor?.email ?? null,
    role: actor?.role ?? null,
    workspaceId: actor?.workspaceId ?? null,
    ip: context.ip,
    userAgent: context.userAgent,
    correlationId: correlationId ?? context.correlationId,
    resource: sanitizeAuditResource(resource),
  };

  return AuditLogModel.create(record);
};
