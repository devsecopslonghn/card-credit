import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CardService } from "../services/card-service.js";
import { createPreviewTokenCodec, type PreviewBinding, type PreviewTokenCodec } from "./preview.js";
import type { ServiceContext } from "../services/types/service-context.js";
import { FinancialTransactionService, type CreateFinancialTransactionBatchInput } from "../services/financial-transaction-service.js";
import { FinancialReportService } from "../services/financial-report-service.js";
import { StatementQueryService } from "../services/statement-query-service.js";
import { AccountService } from "../services/account-service.js";
import { FeeQueryService } from "../services/fee-query-service.js";
import { MonthlyCashbackQueryService } from "../services/monthly-cashback-query-service.js";
import type { CreateRealMoneyAccountInput, FeeCategory } from "@card-credit/contracts";
import { randomUUID } from "node:crypto";
import { MCP_OPERATION, mcpToolMetadata } from "./manifest.js";

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] });

type ContextProvider = ServiceContext | (() => Promise<ServiceContext>);

const binding = (context: ServiceContext): PreviewBinding => ({ workspaceId: context.workspaceId, userId: context.userId, channel: context.channel });

export const registerMcpTools = (server: McpServer, ctx: ContextProvider, previewCodec?: PreviewTokenCodec) => {
  const invocationContext = async () => {
    const base = typeof ctx === "function" ? await ctx() : ctx;
    return { ...base, correlationId: randomUUID() };
  };
  const codec = () => previewCodec ?? createPreviewTokenCodec({ secret: process.env.MCP_PREVIEW_SECRET?.trim() ?? "" });
  server.registerTool("get_statement_summary", mcpToolMetadata("get_statement_summary"), async ({ statementId }: { statementId: string }) => json(await StatementQueryService.getById(await invocationContext(), statementId)));
  server.registerTool("list_transactions", mcpToolMetadata("list_transactions"), async (filters: { date?: string; accountId?: string; categoryId?: string }) => json(await FinancialTransactionService.list(await invocationContext(), { from: filters.date, to: filters.date, accountId: filters.accountId, categoryId: filters.categoryId })));
 server.registerTool("compare_cards", mcpToolMetadata("compare_cards"), async () => json(await CardService.compare(await invocationContext())));
  server.registerTool("list_card_fee_payments", mcpToolMetadata("list_card_fee_payments"), async ({ cardId }: { cardId: string }) => json(await FeeQueryService.listCardPayments(await invocationContext(), cardId)));
  server.registerTool("list_fee_center", mcpToolMetadata("list_fee_center"), async ({ cardId, category }: { cardId?: string; category?: FeeCategory }) => json(await FeeQueryService.listCenter(await invocationContext(), { ...(cardId ? { cardId } : {}), ...(category ? { category } : {}) })));
  server.registerTool("list_monthly_cashbacks", mcpToolMetadata("list_monthly_cashbacks"), async ({ cardId, year }: { cardId: string; year: string }) => json(await MonthlyCashbackQueryService.list(await invocationContext(), cardId, year)));
 server.registerTool("list_upcoming_statements", mcpToolMetadata("list_upcoming_statements"), async ({ limit }: { limit: number }) => json(await StatementQueryService.upcoming(await invocationContext(), limit)));
  server.registerTool("get_personal_finance_summary", mcpToolMetadata("get_personal_finance_summary"), async ({ from, to }: { from: string; to: string }) => json(await FinancialReportService.summary(await invocationContext(), { from, to })));
  server.registerTool("preview_import_financial_transaction", mcpToolMetadata("preview_import_financial_transaction"), async (payload: CreateFinancialTransactionBatchInput) => { const context = await invocationContext(); const normalized = await FinancialTransactionService.preview(context, payload); const confirmationPayload = payload; const metadata = codec().issue(MCP_OPERATION.importFinancialTransactionBatch, confirmationPayload, binding(context)); return json({ operation: MCP_OPERATION.importFinancialTransactionBatch, payload: confirmationPayload, preview: normalized.items.map((item) => ({ amount: item.amount, serviceFeeRate: item.serviceFeeRate ?? 0, serviceFee: item.amount - Number(item.reimbursementExpected ?? 0), reimbursementExpected: item.reimbursementExpected ?? 0, impact: item.previewImpact })), ...metadata }); });
  server.registerTool("confirm_import_financial_transaction", mcpToolMetadata("confirm_import_financial_transaction"), async ({ payload, confirmationToken, idempotencyKey }: { payload: CreateFinancialTransactionBatchInput; confirmationToken: string; idempotencyKey: string }) => { const context = await invocationContext(); codec().verify(confirmationToken, MCP_OPERATION.importFinancialTransactionBatch, payload, binding(context)); return json(await FinancialTransactionService.createBatch(context, payload, idempotencyKey)); });
  server.registerTool("list_accounts", mcpToolMetadata("list_accounts"), async () => json(await AccountService.list(await invocationContext())));
  server.registerTool("preview_create_account", mcpToolMetadata("preview_create_account"), async (payload: CreateRealMoneyAccountInput) => { const context = await invocationContext(); const metadata = codec().issue(MCP_OPERATION.createAccount, payload, binding(context)); return json({ operation: MCP_OPERATION.createAccount, payload, ...metadata }); });
  server.registerTool("confirm_create_account", mcpToolMetadata("confirm_create_account"), async ({ payload, confirmationToken, idempotencyKey }: { payload: CreateRealMoneyAccountInput; confirmationToken: string; idempotencyKey: string }) => { const context = await invocationContext(); codec().verify(confirmationToken, MCP_OPERATION.createAccount, payload, binding(context)); return json(await AccountService.create(context, payload, idempotencyKey)); });
};

export const createMcpServer = (ctx: ContextProvider, previewCodec?: PreviewTokenCodec) => {
  const server = new McpServer({ name: "card-credit", version: "0.1.0" });
  registerMcpTools(server, ctx, previewCodec);
  return server;
};
