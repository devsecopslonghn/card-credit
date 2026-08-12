# Personal Finance Domain Plan

## Core decision

Input is unified, but financial reporting is split into three projections:

- `personalSpending`: cost that belongs to the user.
- `debitCashflow`: movement of money actually held (debit/cash).
- `creditDebt`: credit-card liability and statement settlement.

Credit-card charges are not debit outflow. Paying a statement is not a second
expense. MCP parses natural language and calls services; domain code owns all
calculations.

## Delivery phases

1. Financial primitives and invariants.
2. Account abstraction: `DEBIT`, `CASH`, `CREDIT`.
3. Unified transactions with category and ownership.
4. Credit statement/debt and debit/cash projections.
5. Reimbursement, refund, and cashback as separate events.
6. Categories and monthly budgets/quotas.
7. Recurring expenses.
8. Reports and MCP preview/confirm integration.
9. Data migration, legacy cleanup, and full validation.

Each phase must add focused domain tests, remove duplicate logic in the touched
slice, and keep workspace scoping and idempotent mutations intact.

## Legacy migration runbook

The existing `CreditCard`, `CardTransaction`, and `CardStatement` collections
remain the legacy source during the transition. The new financial transaction
collection is populated by `backend/scripts/migrate-financial-domain.ts`.

1. Run `npm run migrate:finance` with a read-only review of the counts.
2. Snapshot MongoDB before applying.
3. Run `npm run migrate:finance -- --apply` once for the selected environment.
4. Compare migrated transaction counts and gross credit charges by workspace.
5. Keep legacy writes enabled until the new read projection has been verified.
6. Switch writes to `FinancialTransactionService`, then remove the old write
   path in a separate change. Do not run both write paths for the same input.

The migration requires `FINANCE_MIGRATION_WORKSPACE_ID`. Applying also requires
`CONFIRM_FINANCE_MIGRATION=YES`; this prevents an accidental all-workspace write.
Example:

```bash
FINANCE_MIGRATION_WORKSPACE_ID=<workspace-id> \
CONFIRM_FINANCE_MIGRATION=YES \
npm run migrate:finance -- --apply
```

The migration is idempotent through `legacyTransactionId`. Rollback before
legacy write cutover is removal of only the new `Account` and
`FinancialTransaction` records created by the migration, using their migration
marker; do not delete legacy collections.
