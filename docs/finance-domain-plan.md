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

`Account`, `FinancialTransaction`, `CreditCard`, and `CardStatement` are the
active source collections. The former `CardTransaction` collection was backed
up, migrated, and removed on 2026-08-13.

No legacy migration command remains. Future changes must write only through
`FinancialTransactionService`; restore uses the verified MongoDB backup.
