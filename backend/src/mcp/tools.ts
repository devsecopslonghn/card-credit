import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StatementService } from "../services/statement-service.js";
import { TransactionService } from "../services/transaction-service.js";
import { CardService } from "../services/card-service.js";
import { MutationService } from "../services/mutation-service.js";
import { createPreviewToken, consumePreviewToken } from "./preview.js";
import type { ServiceContext } from "../services/types/service-context.js";

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] });

export const registerMcpTools = (server: McpServer, ctx: ServiceContext) => {
  server.registerTool("get_statement_summary", { description: "Read a workspace-scoped credit-card statement summary.", inputSchema: { statementId: z.string().min(1) } }, async ({ statementId }) => json(await StatementService.getSummary(ctx, statementId)));
  server.registerTool("list_transactions", { description: "List workspace-scoped credit-card transactions.", inputSchema: { date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional(), cardId: z.string().min(1).optional(), statementId: z.string().min(1).optional() } }, async (filters) => json(await TransactionService.list(ctx, filters)));
  server.registerTool("compare_cards", { description: "Compare active cards in the fixed workspace.", inputSchema: {} }, async () => json(await CardService.compare(ctx)));
  server.registerTool("list_upcoming_statements", { description: "List unpaid statements ordered by payment due date.", inputSchema: { limit: z.number().int().min(1).max(50).default(20) } }, async ({ limit }) => json(await StatementService.listUpcoming(ctx, limit)));
  server.registerTool("preview_create_transaction", { description: "Prepare a transaction change. Does not write data.", inputSchema: { userCardId: z.string().min(1), transactionDate: z.string(), outcomeAmount: z.number().int().positive(), incomeAmount: z.number().int().nonnegative().optional(), partnerReturnRateBps: z.number().int().min(0).max(10000).optional(), cashbackRateBps: z.number().int().min(0).max(10000), note: z.string().max(1000).optional() } }, async (payload) => json({ operation: "create_transaction", payload, confirmationToken: createPreviewToken("create_transaction", payload), expiresInSeconds: 300 }));
  server.registerTool("confirm_create_transaction", { description: "Confirm a previously previewed transaction change.", inputSchema: { payload: z.record(z.string(), z.unknown()), confirmationToken: z.string().min(1), idempotencyKey: z.string().min(8) } }, async ({ payload, confirmationToken, idempotencyKey }) => { consumePreviewToken(confirmationToken, "create_transaction", payload); return json(await MutationService.createTransaction(ctx, payload, idempotencyKey)); });
  server.registerTool("preview_change_statement_payment_status", { description: "Prepare a statement payment status change. Does not write data.", inputSchema: { statementId: z.string().min(1), action: z.enum(["CLOSED", "PAID", "REOPEN"]) } }, async (payload) => json({ operation: "change_payment_status", payload, confirmationToken: createPreviewToken("change_payment_status", payload), expiresInSeconds: 300 }));
  server.registerTool("confirm_change_statement_payment_status", { description: "Confirm a previously previewed statement status change.", inputSchema: { payload: z.object({ statementId: z.string().min(1), action: z.enum(["CLOSED", "PAID", "REOPEN"]) }), confirmationToken: z.string().min(1), idempotencyKey: z.string().min(8) } }, async ({ payload, confirmationToken, idempotencyKey }) => { consumePreviewToken(confirmationToken, "change_payment_status", payload); return json(await MutationService.changePaymentStatus(ctx, payload.statementId, payload.action, idempotencyKey)); });
};

export const createMcpServer = (ctx: ServiceContext) => {
  const server = new McpServer({ name: "card-credit", version: "0.1.0" });
  registerMcpTools(server, ctx);
  return server;
};
