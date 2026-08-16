export type RestSecurity = "public" | "session" | "bearer";
export type RestEndpointDefinition = {
  method: string;
  path: string;
  summary: string;
  security: RestSecurity;
};

/**
 * Documentation inventory. Route registration parity is deliberately tested
 * separately; this manifest must not be treated as authorization or routing.
 */
export const REST_ENDPOINTS: readonly RestEndpointDefinition[] = [
  { method: "get", path: "/health", summary: "Process liveness", security: "public" },
  { method: "get", path: "/ready", summary: "MongoDB readiness", security: "public" },
  { method: "post", path: "/api/auth/login", summary: "Login", security: "public" },
  { method: "post", path: "/api/auth/register", summary: "Register", security: "public" },
  { method: "get", path: "/api/auth/me", summary: "Current session", security: "session" },
  { method: "post", path: "/api/auth/logout", summary: "Logout", security: "public" },
  { method: "post", path: "/api/auth/forgot-password", summary: "Request password reset", security: "public" },
  { method: "post", path: "/api/auth/reset-password", summary: "Reset password", security: "public" },
  { method: "get", path: "/api/cards", summary: "List cards", security: "session" },
  { method: "post", path: "/api/cards", summary: "Create card", security: "session" },
  { method: "get", path: "/api/cards/{id}", summary: "Get card", security: "session" },
  { method: "put", path: "/api/cards/{id}", summary: "Update card", security: "session" },
  { method: "delete", path: "/api/cards/{id}", summary: "Delete card", security: "session" },
  { method: "get", path: "/api/cards/duplicates", summary: "Find duplicate cards", security: "session" },
  { method: "post", path: "/api/cards/duplicates", summary: "Merge duplicate cards", security: "session" },
  { method: "get", path: "/api/card-statements", summary: "List statements", security: "session" },
  { method: "get", path: "/api/cards/{id}/statements", summary: "List card statements", security: "session" },
  { method: "get", path: "/api/cards/{id}/statements/{statementId}", summary: "Get statement detail", security: "session" },
  { method: "patch", path: "/api/cards/{id}/statements/{statementId}/payment", summary: "Change statement payment status", security: "session" },
  { method: "post", path: "/api/cards/{id}/statements/{statementId}/calendar-email", summary: "Send statement calendar", security: "session" },
  { method: "get", path: "/api/cash-flow/monthly", summary: "Get monthly cash flow", security: "session" },
  { method: "get", path: "/api/notifications", summary: "List notifications", security: "session" },
  { method: "get", path: "/api/notes", summary: "List notes", security: "session" },
  { method: "post", path: "/api/notes", summary: "Upsert note", security: "session" },
  { method: "get", path: "/api/accounts", summary: "List financial accounts", security: "session" },
  { method: "post", path: "/api/accounts", summary: "Create financial account", security: "session" },
  { method: "get", path: "/api/financial-transactions", summary: "List unified financial transactions", security: "session" },
  { method: "post", path: "/api/financial-transactions", summary: "Create unified financial transaction", security: "session" },
  { method: "get", path: "/api/financial-reports/summary", summary: "Get separated personal/debit/credit summary", security: "session" },
  { method: "get", path: "/api/financial-reports/credit-statements", summary: "Get credit statement projection", security: "session" },
  { method: "get", path: "/api/finance/categories", summary: "List finance categories", security: "session" },
  { method: "post", path: "/api/finance/categories", summary: "Create finance category", security: "session" },
  { method: "put", path: "/api/finance/budgets", summary: "Set monthly budget", security: "session" },
  { method: "get", path: "/api/finance/budgets/status", summary: "Get budget status", security: "session" },
  { method: "get", path: "/api/finance/recurring-expenses", summary: "List recurring expenses", security: "session" },
  { method: "post", path: "/api/finance/recurring-expenses", summary: "Create recurring expense", security: "session" },
  { method: "get", path: "/api/card-catalog/providers", summary: "List active providers", security: "public" },
  { method: "get", path: "/api/card-catalog/products", summary: "List active products", security: "public" },
  { method: "get", path: "/api/card-catalog/products/{presetId}", summary: "Get active product", security: "public" },
  { method: "get", path: "/api/profile", summary: "Get profile", security: "session" },
  { method: "patch", path: "/api/profile", summary: "Update profile", security: "session" },
  { method: "get", path: "/api/calendar-subscriptions", summary: "List calendar subscriptions", security: "session" },
  { method: "post", path: "/api/calendar-subscriptions", summary: "Create calendar subscription", security: "session" },
  { method: "delete", path: "/api/calendar-subscriptions/{id}", summary: "Revoke calendar subscription", security: "session" },
] as const;

export const restEndpointKey = (endpoint: Pick<RestEndpointDefinition, "method" | "path">) => `${endpoint.method.toUpperCase()} ${endpoint.path}`;
