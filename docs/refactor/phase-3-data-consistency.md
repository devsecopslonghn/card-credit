# Phase 3 — Data Consistency

## Goal

Guarantee correct financial totals and safe concurrent statement/payment writes.

## Scope

- Verify `actualNetBenefit` and statement generation.
- Use MongoDB transactions for multi-document mutations.
- Use atomic updates for single-document state transitions.
- Keep unique indexes, idempotency, duplicate-key handling, and transient retry.

## Steps

1. Add regression fixtures for month-end, overdue, reopen, and paid states.
2. Add concurrent statement creation tests.
3. Implement transaction commit/abort and retry paths.
4. Test payment state transitions and rollback behavior.
5. Verify no cashback or fee double counting.

## Done when

- No duplicate statements under concurrent requests.
- Invalid paid-state mutations fail closed.
- Transaction failure leaves no partial write.
- Commit, abort, retry, and report tests pass.

## Implemented

- Multi-document mutation service uses `mongoose.startSession()` and
  `withTransaction()`.
- Statement creation and transaction insertion are committed atomically.
- Payment status mutation uses a workspace-scoped atomic state guard.
- Unique statement index and idempotency records remain required safeguards.
