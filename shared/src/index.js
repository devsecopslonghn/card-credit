/**
 * Creates the stable API error envelope shared by browser and server adapters.
 * This module is deliberately pure: it must never import environment, database,
 * framework, authentication, or logging code.
 */
export const createApiErrorBody = (code, message, fields) => ({
  error: {
    code,
    message,
    ...(fields ? { fields } : {}),
  },
});

export const isApiErrorBody = (value) => Boolean(
  value &&
  typeof value === "object" &&
  "error" in value &&
  value.error &&
  typeof value.error === "object" &&
  "code" in value.error &&
  typeof value.error.code === "string" &&
  "message" in value.error &&
  typeof value.error.message === "string",
);

export {
  accountTypeSchema,
  realMoneyAccountTypeSchema,
  accountGroupSchema,
  createAccountInputSchema,
  createRealMoneyAccountInputSchema,
  accountSchema,
  accountListSchema,
} from "./account-contracts.js";
export {
  catalogNetworkSchema,
  catalogThemeSchema,
  catalogProductSchema,
  catalogProviderSchema,
  catalogProductListSchema,
  catalogProviderListSchema,
} from "./catalog-contracts.js";
export {
  monthlyCardDataSchema,
  cardPortfolioCardSchema,
  cardPortfolioListSchema,
} from "./portfolio-contracts.js";
export {
  financialTransactionTypeSchema,
  ownershipSchema,
  createFinancialTransactionInputSchema,
  createFinancialTransactionBatchInputSchema,
  financialImpactSchema,
  financialTransactionSchema,
  financialTransactionListSchema,
} from "./transaction-contracts.js";
export {
  budgetMonthSchema,
  budgetStatusSchema,
  budgetStatusSchemaDto,
  budgetStatusListSchema,
} from "./planning-contracts.js";
export {
  statementSummarySchema,
  statementSchema,
  statementListSchema,
} from "./statement-contracts.js";
