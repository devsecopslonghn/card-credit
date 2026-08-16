import { z, type ZodRawShape } from "zod";
import { createFinancialTransactionBatchInputSchema, createRealMoneyAccountInputSchema } from "@card-credit/contracts";

export type McpToolKind = "query" | "preview" | "confirm";
export type McpToolDefinition = {
  name: string;
  description: string;
  kind: McpToolKind;
  operation?: string;
  inputSchema: ZodRawShape;
};

export const MCP_OPERATION = {
  importFinancialTransactionBatch: "import_financial_transaction_batch",
  createAccount: "create_account",
} as const;

const definitions = [
  { name: "get_statement_summary", description: "Read a workspace-scoped credit-card statement summary from Financial Domain.", kind: "query", inputSchema: { statementId: z.string().min(1) } },
  { name: "list_transactions", description: "List all workspace-scoped financial transactions from Financial Domain, including debit, cash and credit.", kind: "query", inputSchema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), accountId: z.string().min(1).optional(), categoryId: z.string().min(1).optional() } },
  { name: "compare_cards", description: "Compare active cards in the fixed workspace.", kind: "query", inputSchema: {} },
  { name: "list_upcoming_statements", description: "List unpaid statements from Financial Domain ordered by payment due date.", kind: "query", inputSchema: { limit: z.number().int().min(1).max(50).default(20) } },
  { name: "get_personal_finance_summary", description: "Read separated personal spending, debit/cash flow and credit debt.", kind: "query", inputSchema: { from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) } },
  { name: "preview_import_financial_transaction", description: "Prepare transactions and return backend-calculated impacts. The caller must present previewImpact exactly; do not recalculate fees or receivables.", kind: "preview", operation: MCP_OPERATION.importFinancialTransactionBatch, inputSchema: createFinancialTransactionBatchInputSchema.shape },
  { name: "confirm_import_financial_transaction", description: "Confirm the whole financial transaction batch once after human review.", kind: "confirm", operation: MCP_OPERATION.importFinancialTransactionBatch, inputSchema: { payload: createFinancialTransactionBatchInputSchema, confirmationToken: z.string().min(1), idempotencyKey: z.string().min(8) } },
  { name: "list_accounts", description: "List accounts grouped as REAL_MONEY (DEBIT, CASH, E_WALLET) or DEBT (CREDIT), with balances calculated from financial transactions.", kind: "query", inputSchema: {} },
  { name: "preview_create_account", description: "Prepare a debit, cash or e-wallet account. Does not write data.", kind: "preview", operation: MCP_OPERATION.createAccount, inputSchema: createRealMoneyAccountInputSchema.shape },
  { name: "confirm_create_account", description: "Confirm a previously previewed real-money account. Retries are idempotent and return the existing account.", kind: "confirm", operation: MCP_OPERATION.createAccount, inputSchema: { payload: createRealMoneyAccountInputSchema, confirmationToken: z.string().min(1), idempotencyKey: z.string().min(8) } },
] satisfies readonly McpToolDefinition[];

export const mcpToolManifest = definitions;
export const MCP_TOOL_INVENTORY = mcpToolManifest.map(({ name }) => name);
export type McpToolName = (typeof mcpToolManifest)[number]["name"];

export const mcpToolMetadata = (name: McpToolName) => {
  const definition = mcpToolManifest.find((item) => item.name === name);
  if (!definition) throw new Error(`MCP tool ${name} is missing from manifest`);
  return { description: definition.description, inputSchema: definition.inputSchema };
};
