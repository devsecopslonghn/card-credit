import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CardService } from "../services/card-service.js";
import { createPreviewToken, consumePreviewToken } from "./preview.js";
import type { ServiceContext } from "../services/types/service-context.js";
import { FinancialTransactionService, type CreateFinancialTransactionBatchInput } from "../services/financial-transaction-service.js";
import { FinancialReportService } from "../services/financial-report-service.js";
import { AccountService } from "../services/account-service.js";

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] });

export const registerMcpTools = (server: McpServer, ctx: ServiceContext) => {
  server.registerTool("get_statement_summary", { description: "Read a workspace-scoped credit-card statement summary from Financial Domain.", inputSchema: { statementId: z.string().min(1) } }, async ({ statementId }) => json(await FinancialReportService.statementSummary(ctx, statementId)));
  server.registerTool("list_transactions", { description: "List all workspace-scoped financial transactions from Financial Domain, including debit, cash and credit.", inputSchema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), accountId: z.string().min(1).optional(), categoryId: z.string().min(1).optional() } }, async (filters) => json(await FinancialTransactionService.list(ctx, { from: filters.date, to: filters.date, accountId: filters.accountId, categoryId: filters.categoryId })));
  server.registerTool("compare_cards", { description: "Compare active cards in the fixed workspace.", inputSchema: {} }, async () => json(await CardService.compare(ctx)));
  server.registerTool("list_upcoming_statements", { description: "List unpaid statements from Financial Domain ordered by payment due date.", inputSchema: { limit: z.number().int().min(1).max(50).default(20) } }, async ({ limit }) => json(await FinancialReportService.upcomingStatements(ctx, limit)));
  server.registerTool("get_personal_finance_summary", { description: "Read separated personal spending, debit/cash flow and credit debt.", inputSchema: { from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) } }, async ({ from, to }) => json(await FinancialReportService.summary(ctx, { from, to })));
  const financialTransaction = z.object({ accountId: z.string().min(1), transactionDate: z.string(), amount: z.number().int().positive(), categoryId: z.string().optional(), transactionType: z.enum(["EXPENSE", "REIMBURSEMENT", "REFUND", "CASHBACK", "INCOME", "STATEMENT_PAYMENT"]).optional(), ownership: z.enum(["PERSONAL", "PAID_FOR_OTHER"]).optional(), reimbursementExpected: z.number().int().nonnegative().optional(), refundReceived: z.number().int().nonnegative().optional(), note: z.string().max(1000).optional(), statementId: z.string().optional() });
  server.registerTool("preview_import_financial_transaction", { description: "Prepare one or more financial transactions. Does not write data; confirm once for the whole batch.", inputSchema: { items: z.array(financialTransaction).min(1).max(50) } }, async (payload) => json({ operation: "import_financial_transaction_batch", payload, confirmationToken: createPreviewToken("import_financial_transaction_batch", payload), expiresInSeconds: 1800 }));
  server.registerTool("confirm_import_financial_transaction", { description: "Confirm the whole financial transaction batch once after human review.", inputSchema: { payload: z.object({ items: z.array(financialTransaction).min(1).max(50) }), confirmationToken: z.string().min(1), idempotencyKey: z.string().min(8) } }, async ({ payload, confirmationToken, idempotencyKey }) => { consumePreviewToken(confirmationToken, "import_financial_transaction_batch", payload); return json(await FinancialTransactionService.createBatch(ctx, payload as CreateFinancialTransactionBatchInput, idempotencyKey)); });
  server.registerTool("list_accounts", { description: "List accounts grouped as REAL_MONEY (DEBIT, CASH, E_WALLET) or DEBT (CREDIT), with balances calculated from financial transactions.", inputSchema: {} }, async () => json(await AccountService.list(ctx)));
  server.registerTool("preview_create_account", { description: "Prepare a debit, cash or e-wallet account. Does not write data.", inputSchema: { name: z.string().min(1).max(120), type: z.enum(["DEBIT", "CASH", "E_WALLET"]), openingBalance: z.number().int().nonnegative().default(0) } }, async (payload) => json({ operation: "create_account", payload, confirmationToken: createPreviewToken("create_account", payload), expiresInSeconds: 300 }));
  server.registerTool("confirm_create_account", { description: "Confirm a previously previewed real-money account.", inputSchema: { payload: z.object({ name: z.string().min(1).max(120), type: z.enum(["DEBIT", "CASH", "E_WALLET"]), openingBalance: z.number().int().nonnegative() }), confirmationToken: z.string().min(1), idempotencyKey: z.string().min(8) } }, async ({ payload, confirmationToken }) => { consumePreviewToken(confirmationToken, "create_account", payload); return json(await AccountService.create(ctx, payload)); });
};

export const createMcpServer = (ctx: ServiceContext) => {
  const server = new McpServer({ name: "card-credit", version: "0.1.0" });
  registerMcpTools(server, ctx);
  return server;
};
