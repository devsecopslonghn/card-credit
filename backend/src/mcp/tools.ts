import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CardService } from "../services/card-service.js";
import { createPreviewToken, consumePreviewToken } from "./preview.js";
import type { ServiceContext } from "../services/types/service-context.js";
import { FinancialTransactionService, type CreateFinancialTransactionBatchInput } from "../services/financial-transaction-service.js";
import { FinancialReportService } from "../services/financial-report-service.js";
import { StatementQueryService } from "../services/statement-query-service.js";
import { AccountService } from "../services/account-service.js";
import type { CreateRealMoneyAccountInput } from "@card-credit/contracts";
import { randomUUID } from "node:crypto";
import { mcpToolMetadata } from "./manifest.js";

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] });

type ContextProvider = ServiceContext | (() => Promise<ServiceContext>);

export const registerMcpTools = (server: McpServer, ctx: ContextProvider) => {
  const invocationContext = async () => {
    const base = typeof ctx === "function" ? await ctx() : ctx;
    return { ...base, correlationId: randomUUID() };
  };
  server.registerTool("get_statement_summary", mcpToolMetadata("get_statement_summary"), async ({ statementId }: { statementId: string }) => json(await StatementQueryService.getById(await invocationContext(), statementId)));
  server.registerTool("list_transactions", mcpToolMetadata("list_transactions"), async (filters: { date?: string; accountId?: string; categoryId?: string }) => json(await FinancialTransactionService.list(await invocationContext(), { from: filters.date, to: filters.date, accountId: filters.accountId, categoryId: filters.categoryId })));
  server.registerTool("compare_cards", mcpToolMetadata("compare_cards"), async () => json(await CardService.compare(await invocationContext())));
  server.registerTool("list_upcoming_statements", mcpToolMetadata("list_upcoming_statements"), async ({ limit }: { limit: number }) => json(await StatementQueryService.upcoming(await invocationContext(), limit)));
  server.registerTool("get_personal_finance_summary", mcpToolMetadata("get_personal_finance_summary"), async ({ from, to }: { from: string; to: string }) => json(await FinancialReportService.summary(await invocationContext(), { from, to })));
  server.registerTool("preview_import_financial_transaction", mcpToolMetadata("preview_import_financial_transaction"), async (payload: CreateFinancialTransactionBatchInput) => { const normalized = await FinancialTransactionService.preview(await invocationContext(), payload); const confirmationPayload = payload; return json({ operation: "import_financial_transaction_batch", payload: confirmationPayload, preview: normalized.items.map((item) => ({ amount: item.amount, serviceFeeRate: item.serviceFeeRate ?? 0, serviceFee: item.amount - Number(item.reimbursementExpected ?? 0), reimbursementExpected: item.reimbursementExpected ?? 0, impact: item.previewImpact })), confirmationToken: createPreviewToken("import_financial_transaction_batch", confirmationPayload), expiresInSeconds: 1800 }); });
  server.registerTool("confirm_import_financial_transaction", mcpToolMetadata("confirm_import_financial_transaction"), async ({ payload, confirmationToken, idempotencyKey }: { payload: CreateFinancialTransactionBatchInput; confirmationToken: string; idempotencyKey: string }) => { consumePreviewToken(confirmationToken, "import_financial_transaction_batch", payload); return json(await FinancialTransactionService.createBatch(await invocationContext(), payload, idempotencyKey)); });
  server.registerTool("list_accounts", mcpToolMetadata("list_accounts"), async () => json(await AccountService.list(await invocationContext())));
  server.registerTool("preview_create_account", mcpToolMetadata("preview_create_account"), async (payload: CreateRealMoneyAccountInput) => json({ operation: "create_account", payload, confirmationToken: createPreviewToken("create_account", payload), expiresInSeconds: 300 }));
  server.registerTool("confirm_create_account", mcpToolMetadata("confirm_create_account"), async ({ payload, confirmationToken, idempotencyKey }: { payload: CreateRealMoneyAccountInput; confirmationToken: string; idempotencyKey: string }) => { consumePreviewToken(confirmationToken, "create_account", payload); return json(await AccountService.create(await invocationContext(), payload, idempotencyKey)); });
};

export const createMcpServer = (ctx: ContextProvider) => {
  const server = new McpServer({ name: "card-credit", version: "0.1.0" });
  registerMcpTools(server, ctx);
  return server;
};
