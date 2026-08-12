# Phase 4 — Controlled Mutations

## Goal

Allow AI-assisted writes only through explicit human confirmation.

## Scope

- `preview_create_transaction` / `confirm_create_transaction`.
- `preview_change_statement_payment_status` /
  `confirm_change_statement_payment_status`.

## Rules

- Preview never writes.
- Confirm revalidates resource, payload, scope, state, and expiry.
- Every confirm uses idempotency and audit.
- MongoDB transaction protects multi-document writes.
- No email or external side effect runs inside a database transaction.

## Done when

- AI cannot mutate data with a single unconfirmed call.
- Repeated confirmation has one effect.
- UI displays the exact card, statement, amount, and status before confirmation.
- Audit and rollback tests pass.

## Implemented

- Added preview/confirm MCP tools for transaction creation and payment status.
- Preview token is HMAC-bound to operation and exact payload, expiring after
  five minutes.
- Confirm calls `MutationService`, which validates again, uses idempotency keys,
  MongoDB transactions, and audit records.
- Added preview token regression tests.
