import { z, type ZodRawShape } from "zod";
import { createFinancialTransactionBatchInputSchema, createRealMoneyAccountInputSchema, feeCategorySchema, financialTransactionListQuerySchema, reportDateSchema, statementPaymentInputSchema } from "@card-credit/contracts";
import { PAYMENT_OPERATION } from "../payment-contract.js";

export type McpToolKind = "query" | "preview" | "confirm";
export type McpWriterMode = "read" | "write";
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
  payStatement: PAYMENT_OPERATION,
} as const;

const definitions = [
  { name: "get_statement_summary", description: "Read a workspace-scoped credit-card statement summary from Financial Domain.", kind: "query", inputSchema: { statementId: z.string().min(1) } },
  { name: "list_transactions", description: "List workspace-scoped financial transactions from Financial Domain using an inclusive from/to date range and optional account/category filters.", kind: "query", inputSchema: { ...financialTransactionListQuerySchema.shape, date: z.never().optional() } },
  { name: "get_monthly_cash_flow", description: "Read canonical Financial Domain cash-flow totals by month and card in the fixed workspace.", kind: "query", inputSchema: { period: z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/).optional(), cardId: z.string().min(1).optional() } },
  { name: "compare_cards", description: "Compare active cards in the fixed workspace.", kind: "query", inputSchema: {} },
  { name: "list_duplicate_cards", description: "List exact duplicate card groups in the fixed workspace, including inactive cards.", kind: "query", inputSchema: {} },
  { name: "list_card_fee_payments", description: "List canonical fee payments for one card in the fixed workspace.", kind: "query", inputSchema: { cardId: z.string().min(1) } },
  { name: "list_fee_center", description: "List canonical categorized fee records in the fixed workspace.", kind: "query", inputSchema: { cardId: z.string().min(1).optional(), category: feeCategorySchema.optional() } },
  { name: "list_monthly_cashbacks", description: "List canonical monthly bank cashback records for one card and year.", kind: "query", inputSchema: { cardId: z.string().min(1), year: z.string().regex(/^\d{4}$/) } },
  { name: "list_upcoming_statements", description: "List unpaid statements from Financial Domain ordered by payment due date.", kind: "query", inputSchema: { limit: z.number().int().min(1).max(50).default(20) } },
  { name: "get_personal_finance_summary", description: "Read canonical ledger totals and benefit reconciliation, including bank cashback and paid card fees.", kind: "query", inputSchema: { from: reportDateSchema, to: reportDateSchema } },
  { name: "preview_import_financial_transaction", description: "Prepare transactions and return backend-calculated impacts. The caller must present previewImpact exactly; do not recalculate fees or receivables.", kind: "preview", operation: MCP_OPERATION.importFinancialTransactionBatch, inputSchema: createFinancialTransactionBatchInputSchema.shape },
  { name: "confirm_import_financial_transaction", description: "Confirm the whole financial transaction batch once after human review.", kind: "confirm", operation: MCP_OPERATION.importFinancialTransactionBatch, inputSchema: { payload: createFinancialTransactionBatchInputSchema, confirmationToken: z.string().min(1), idempotencyKey: z.string().min(8) } },
  { name: "list_accounts", description: "List accounts grouped as REAL_MONEY (DEBIT, CASH, E_WALLET) or DEBT (CREDIT), with balances calculated from financial transactions.", kind: "query", inputSchema: {} },
  { name: "preview_create_account", description: "Prepare a debit, cash or e-wallet account. Does not write data.", kind: "preview", operation: MCP_OPERATION.createAccount, inputSchema: createRealMoneyAccountInputSchema.shape },
  { name: "confirm_create_account", description: "Confirm a previously previewed real-money account. Retries are idempotent and return the existing account.", kind: "confirm", operation: MCP_OPERATION.createAccount, inputSchema: { payload: createRealMoneyAccountInputSchema, confirmationToken: z.string().min(1), idempotencyKey: z.string().min(8) } },
  { name: "preview_pay_statement", description: "Preview a statement payment using the canonical statement payment service. Does not write the ledger.", kind: "preview", operation: MCP_OPERATION.payStatement, inputSchema: { cardId: z.string().trim().min(1), statementId: z.string().trim().min(1), input: statementPaymentInputSchema } },
  { name: "confirm_pay_statement", description: "Confirm a previously previewed statement payment with the canonical payment command and idempotency guard.", kind: "confirm", operation: MCP_OPERATION.payStatement, inputSchema: { cardId: z.string().trim().min(1), statementId: z.string().trim().min(1), input: statementPaymentInputSchema, previewId: z.string().trim().min(1), confirmationToken: z.string().min(1), idempotencyKey: z.string().trim().min(8).max(200) } },
] satisfies readonly McpToolDefinition[];

export const mcpToolManifest = definitions;
export const MCP_TOOL_INVENTORY = mcpToolManifest.map(({ name }) => name);
export type McpToolName = (typeof mcpToolManifest)[number]["name"];

export const mcpToolManifestForMode = (mode: McpWriterMode = "write") =>
  mcpToolManifest.filter((definition) => mode === "write" || definition.kind === "query");

export const mcpToolNamesForMode = (mode: McpWriterMode = "write") =>
  mcpToolManifestForMode(mode).map(({ name }) => name);

export const mcpToolMetadata = (name: McpToolName) => {
  const definition = mcpToolManifest.find((item) => item.name === name);
  if (!definition) throw new Error(`MCP tool ${name} is missing from manifest`);
  return { description: definition.description, inputSchema: definition.inputSchema };
};
