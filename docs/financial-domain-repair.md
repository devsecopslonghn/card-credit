# Financial Domain audit and repair runbook

## Canonical invariants

- `INCOME` is real income only.
- `BALANCE_ADJUSTMENT` and `OPENING_BALANCE_ADJUSTMENT` are technical ledger
  events: zero personal spending, zero operating cashflow and zero card debt.
- `EXPENSE + PAID_FOR_OTHER` creates card debt and receivable.
- `REIMBURSEMENT` increases the receiving real-money account and reduces the
  receivable; it does not settle card debt or change statement payment state.
- `STATEMENT_PAYMENT` reduces card debt and real-money balance. A statement is
  `PAID` only when its payment ledger is real and complete.
- Current net assets are active real-money balances plus outstanding receivable
  minus outstanding statement debt. Archived accounts and paid statement debt
  are excluded from those current totals.

## Read-only dry-run

Run from a controlled environment with a read-only database identity:

```bash
REPAIR_WORKSPACE_ID=<workspace-id> npm run repair:finance:dry-run

# August 2026 reconciliation (read-only)
REPAIR_WORKSPACE_ID=<workspace-id> \
REPAIR_FROM=2026-08-01 REPAIR_TO=2026-08-31 \
npm run repair:finance:dry-run
```

The command reads accounts, financial transactions and statements only. It
reports stale `accountType`, duplicate fingerprints, likely technical income,
archived balances and PAID statements with outstanding debt. It never updates,
deletes, archives, voids or inserts data.

When `REPAIR_FROM` and `REPAIR_TO` are supplied, it also prints a monthly
reconciliation snapshot. `beforeRepair` is the observed ledger state;
`afterRepair` is intentionally `null` until a separately reviewed
preview/confirm migration exists, so the dry-run cannot imply a write or invent
post-repair numbers.

## Current workspace baseline

The local Kubernetes read-only probe found 8 accounts, 53 transactions and 13
statements. Tiền mặt is active with ledger balance `31,121,918`; Vietcombank is
archived but still has openingBalance `20,000,000`; 13 transactions have a
stale `accountType`. Max has the original `16,193,000` expense, a
`15,543,000` reimbursement received in CASH, and an erroneous
`16,193,000` statement-payment transaction that must be corrected by explicit
preview/confirm—not deleted.

## Correction and rollback

For an erroneous PAID statement, use `preview_pay_statement` with:

```json
{
  "action": "REOPEN",
  "reason": "Correction: reimbursement was incorrectly treated as statement payment",
  "reverseErroneousPayment": true,
  "expectedVersion": "<statement-updatedAt>"
}
```

Confirming marks the erroneous payment transaction void with reason and
timestamp, reopens the statement, and writes audit/idempotency records in one
Mongo transaction. It does not delete the transaction or create an expense.
If the transaction was a real payment, the command rejects with
`STATEMENT_PAYMENT_REVERSAL_REQUIRED`.

Rollback is a database transaction rollback on any failed write. Before any
future repair apply, take a workspace backup, save the preview/report hash,
require human confirmation, and retain the audit record. There is no automatic
production apply command in this repository.
