import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { OpenAPIV3 } from "openapi-types";

type Security = Array<Record<string, string[]>>;
const auth: Security = [{ cookieAuth: [] }];
const bearer: Security = [{ bearerAuth: [] }];
const operation = (summary: string, security: Security = auth) => ({ summary, security, responses: { "200": { description: "Success" }, "400": { description: "Invalid request" }, "401": { description: "Unauthenticated" }, "403": { description: "Forbidden" }, "404": { description: "Not found" }, "409": { description: "Conflict" }, "500": { description: "Unexpected error" } } });
const paths: Record<string, Record<string, unknown>> = {};
const add = (method: string, path: string, summary: string, security = auth) => { paths[path] ??= {}; paths[path][method] = operation(summary, security); };

const endpoints: Array<[string, string, string, Security]> = [
  ["get", "/health", "Process liveness", []], ["get", "/ready", "MongoDB readiness", []],
  ["post", "/api/auth/login", "Login", []], ["post", "/api/auth/register", "Register", []], ["get", "/api/auth/me", "Current session", auth], ["post", "/api/auth/logout", "Logout", []], ["post", "/api/auth/forgot-password", "Request password reset", []], ["post", "/api/auth/reset-password", "Reset password", []],
  ["get", "/api/cards", "List cards", auth], ["post", "/api/cards", "Create card", auth], ["get", "/api/cards/{id}", "Get card", auth], ["put", "/api/cards/{id}", "Update card", auth], ["delete", "/api/cards/{id}", "Delete card", auth], ["get", "/api/cards/duplicates", "Find duplicate cards", auth], ["post", "/api/cards/duplicates", "Merge duplicate cards", auth],
  ["get", "/api/card-transactions", "List transactions", auth], ["post", "/api/card-transactions", "Create transaction", auth], ["patch", "/api/card-transactions/{id}", "Update transaction", auth], ["delete", "/api/card-transactions/{id}", "Delete transaction", auth], ["patch", "/api/card-transactions/{id}/cashback", "Update transaction cashback", auth],
  ["get", "/api/card-statements", "List statements", auth], ["get", "/api/cards/{id}/statements", "List card statements", auth], ["get", "/api/cards/{id}/statements/{statementId}", "Get statement detail", auth], ["patch", "/api/cards/{id}/statements/{statementId}/payment", "Change statement payment status", auth], ["post", "/api/cards/{id}/statements/{statementId}/calendar-email", "Send statement calendar", auth],
  ["get", "/api/reports/summary", "Get financial report", auth], ["get", "/api/cash-flow/monthly", "Get monthly cash flow", auth], ["get", "/api/notifications", "List notifications", auth], ["get", "/api/notes", "List notes", auth], ["post", "/api/notes", "Upsert note", auth],
  ["get", "/api/accounts", "List financial accounts", auth], ["post", "/api/accounts", "Create financial account", auth], ["get", "/api/financial-transactions", "List unified financial transactions", auth], ["post", "/api/financial-transactions", "Create unified financial transaction", auth], ["get", "/api/financial-reports/summary", "Get separated personal/debit/credit summary", auth], ["get", "/api/financial-reports/credit-statements", "Get credit statement projection", auth], ["get", "/api/finance/categories", "List finance categories", auth], ["post", "/api/finance/categories", "Create finance category", auth], ["put", "/api/finance/budgets", "Set monthly budget", auth], ["get", "/api/finance/budgets/status", "Get budget status", auth], ["get", "/api/finance/recurring-expenses", "List recurring expenses", auth], ["post", "/api/finance/recurring-expenses", "Create recurring expense", auth],
  ["get", "/api/card-catalog/providers", "List active providers", []], ["get", "/api/card-catalog/products", "List active products", []], ["get", "/api/card-catalog/products/{presetId}", "Get active product", []], ["get", "/api/profile", "Get profile", auth], ["patch", "/api/profile", "Update profile", auth], ["get", "/api/calendar-subscriptions", "List calendar subscriptions", auth], ["post", "/api/calendar-subscriptions", "Create calendar subscription", auth], ["delete", "/api/calendar-subscriptions/{id}", "Revoke calendar subscription", auth],
];
for (const [method, path, summary, security] of endpoints) add(method, path, summary, security);
add("post", "/mcp", "MCP Streamable HTTP endpoint", bearer);

export const registerApiDocs = async (app: FastifyInstance) => {
  await app.register(swagger, { mode: "static", specification: { path: "", document: ({
    openapi: "3.0.3", info: { title: "Card Credit API", version: "0.1.0", description: "REST API and remote MCP endpoint for Card Credit." },
    tags: [{ name: "REST API" }, { name: "MCP" }], servers: [{ url: "/", description: "Current origin" }],
    components: { securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: "card_credit_session" }, bearerAuth: { type: "http", scheme: "bearer" } } }, paths,
    "x-mcp": { transport: "Streamable HTTP", endpoint: "/mcp", authentication: "Authorization: Bearer <MCP_HTTP_TOKEN>", fixedContext: ["MCP_USER_ID", "MCP_WORKSPACE_ID"], tools: ["get_statement_summary", "list_transactions", "compare_cards", "list_upcoming_statements", "get_personal_finance_summary", "list_accounts", "preview_create_account", "confirm_create_account", "preview_import_financial_transaction", "confirm_import_financial_transaction", "preview_create_transaction", "confirm_create_transaction", "preview_change_statement_payment_status", "confirm_change_statement_payment_status"], mutationPolicy: "Preview -> explicit human confirmation -> idempotent confirm -> audit" },
  } as unknown as OpenAPIV3.Document) } });
  await app.register(swaggerUi, { routePrefix: "/docs", staticCSP: true, uiConfig: { docExpansion: "list", deepLinking: true } });
};
