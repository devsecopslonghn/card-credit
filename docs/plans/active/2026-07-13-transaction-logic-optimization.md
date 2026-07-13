# Transaction Logic Optimization

## Problem statement

Transaction PATCH currently treats every `incomeInputMode` value other than
`RATE`, including an omitted value, as `AMOUNT`. A partial update can therefore
change persisted input semantics without user intent. The transaction list also
loads its referenced card and statement separately for every row, causing query
count to grow linearly with the number of transactions.

## Current behavior

- `PATCH /api/card-transactions/:id` merges most omitted fields from the current
  transaction, but silently resets an omitted or invalid `incomeInputMode` to
  `AMOUNT`.
- `GET /api/card-transactions` runs one sorted transaction query followed by up
  to one card query and one statement query per transaction.
- List access is workspace-scoped, has no pagination, and omits unavailable
  referenced card/statement projections from each response row.

## Target behavior

- PATCH preserves the current `incomeInputMode` when it is omitted and rejects
  an explicitly invalid enum value. Explicit `RATE` and `AMOUNT` remain valid.
- CREATE retains its existing default of `AMOUNT` when the mode is omitted.
- Transaction list performs one transaction query and at most one workspace-
  scoped batch query for cards and one for statements, while preserving response
  ordering, shape, filters, authorization, and missing-reference behavior.

## Scope

Phase 1 changes only transaction input normalization, transaction-list reference
loading, focused backend tests, and this plan/documentation navigation. No API or
database schema change is required.

## Non-goals

- Batch statement loading for `/cards` or transaction loading per statement.
- Calendar feed aggregation changes.
- Reminder scheduler query optimization.
- Frontend partial-failure handling.
- Refactoring the shared due-row builder.
- New pagination, caching, repository abstractions, or dependencies.

## Implementation phases

1. **Transaction correctness and list N+1 removal**: preserve/reject
   `incomeInputMode` correctly, batch-load list references, and add regressions.
2. Batch statement loading for `/cards` and remove per-statement transaction
   queries.
3. Batch calendar-feed amount aggregation.
4. Restrict reminder scans by due-date window and batch related data.
5. Add frontend partial-failure handling.
6. Refactor a shared due-row builder.

Phase 1 and Phase 2 are complete. Phase 3 is the next planned iteration and was
not started.

## Validation

- Backend focused tests and full `npm run validate` (typecheck, lint, tests,
  build).
- Shared validation only if its contract changes.
- `git diff --check`, final status/stat inspection, and full diff review.
- No production database, SMTP, smoke, migration, seed, or E2E command is
  required for this backend-only phase.

## Risks

- Mongoose query mocking can become brittle; prefer focused domain tests and
  route-level model stubs that assert stable query inputs and response behavior.
- Batch `$in` queries must retain `workspaceId` filtering to avoid cross-
  workspace projection.
- Legacy rows may have missing references; their current response shape must be
  preserved.

## Rollback considerations

The phase has no schema or data migration. Rollback consists of reverting the
domain normalization, list batch-loading, tests, and documentation changes. Data
written after the fix remains compatible with the previous schema.

## Status

Phase 1 and Phase 2 complete on `ai-task/upcoming-payment-quick-actions`.
Follow-up phases remain planned and were not started.

## Phase 1 implementation record

Changed files:

- `backend/src/statement-domain.ts`: resolve `incomeInputMode` from explicit
  input, then the current transaction, then the CREATE default; reject values
  outside `RATE` and `AMOUNT`.
- `backend/src/transaction-routes.ts`: collect and deduplicate reference IDs,
  batch-load cards/statements with workspace filters, and assemble rows from
  maps in the original transaction order.
- `backend/tests/transactions.test.ts`: add mode regression coverage and route
  coverage for empty/single/multiple lists, shared and distinct references,
  missing references, optional missing statement ID, stable ordering/shape,
  workspace-scoped query inputs, deduplication, and fixed reference-query count.
- `docs/README.md` and this plan: register and record the active optimization
  workstream.

Implementation decisions:

- PATCH semantics remain a field merge: omitted fields retain current values.
  CREATE still defaults an omitted `incomeInputMode` to `AMOUNT`.
- Invalid explicit modes use the existing `INVALID_REQUEST` API envelope; no
  shared contract or schema change was introduced.
- Empty lists skip both reference queries. Non-empty lists use at most one card
  query and one statement query, each scoped by `workspaceId` and `_id.$in`.
- Missing references retain the previous serializer behavior. In particular, a
  statement projection is emitted only when its card is also available.
- The remaining transaction input fields use nullish merging, so valid `false`,
  `0`, and empty-note values are preserved. No other same-root-cause reset was
  found in this update flow.

Validation results:

- `cd backend && node --import tsx --test tests/transactions.test.ts`: passed.
- `cd backend && npm run typecheck`: passed.
- `cd backend && npm run validate`: passed after the final test update;
  typecheck, lint, all 15 backend test files, and build passed.
- The earlier attempted focused command
  `npm test -- --test-name-pattern='transaction input preserves|transaction list'`
  did not run tests because the package script places its glob before forwarded
  arguments and Node interpreted the option as a path. It was replaced by the
  direct Node test-runner command above.

Skipped checks:

- Shared validation was skipped because shared contracts were unchanged.
- Frontend validation, Playwright/E2E, live API smoke tests, SMTP, and database-
  backed tests were skipped because this phase changes backend domain/list logic
  only and its route tests use isolated model stubs. No production database was
  accessed.

Blockers: none.

Remaining risks:

- Route tests prove query count and scope through model stubs, not a live MongoDB
  execution plan. Mongoose casting of the existing ObjectId string format is
  already used throughout these routes, but a future isolated Mongo integration
  harness could add end-to-end assurance.
- The endpoint remains unpaginated; batching removes linear query count but does
  not cap response size.

Follow-up phases at the end of Phase 1: Phase 2 batch statement loading for
`/cards`; Phase 3 calendar-feed aggregation; Phase 4 reminder due-window
batching; Phase 5 frontend partial-failure handling; Phase 6 shared due-row
builder refactor.

## Phase 2 implementation record

Changed files:

- `backend/src/transaction-routes.ts`: add authenticated workspace batch endpoint
  `GET /api/card-statements`, group transactions by statement in memory, and
  replace per-statement transaction queries in the existing per-card endpoint
  with one workspace-scoped `$in` query.
- `backend/tests/transactions.test.ts`: cover authentication, workspace-scoped
  batch query inputs, fixed query count, card/statement ordering, transaction
  grouping, and preserved summary values for both batch and per-card routes.
- `frontend/lib/api/transactionsClient.ts`: add the batch statement client.
- `frontend/app/cards/page.tsx`: replace one statement request per card with one
  dashboard batch request.
- `frontend/tests/dueStatements.test.mjs`: lock the dashboard to the batch client
  and prevent regression to the per-card request loop.

Implementation decisions:

- The new endpoint derives visible card IDs from a workspace-scoped card query;
  it does not trust client-provided IDs and excludes orphan statements, matching
  the previous dashboard behavior.
- Cards retain `/api/cards` ordering and each card's statements retain descending
  `statementDate` ordering, matching the previous flattened request result.
- Empty card or statement sets skip downstream queries. Non-empty dashboard
  loads use three fixed backend queries: cards, statements, and transactions.
- `GET /api/cards/:id/statements` remains available for card detail and preserves
  its response contract while reducing transaction queries from one per
  statement to at most one total.
- Phase 5 partial-failure semantics were intentionally not introduced; the
  existing all-or-error dashboard behavior remains.

Validation results:

- Focused backend transaction route test file: passed.
- Focused frontend due-statement test file: passed.
- `cd backend && npm run validate`: passed after the final test update;
  typecheck, lint, all 15 backend test files, and build passed.
- `cd frontend && npm run typecheck && npm run lint && npm test`: passed; eight
  unit test files and one integration test file passed.
- The first sandboxed frontend build reached Next.js but failed because Google
  Fonts network access was unavailable. The approved `cd frontend && npm run
  build` rerun with network access passed, including compile, TypeScript, and all
  static route generation. The pre-existing middleware deprecation warning
  remains.

Skipped checks:

- Shared validation was skipped because shared contracts were unchanged.
- Playwright/E2E, live API/database smoke tests, and production database checks
  were skipped; focused route tests use isolated model stubs and no database was
  needed or accessed.

Blockers: none.

Remaining risks:

- The dashboard batch endpoint is not paginated; query count is fixed but result
  size still grows with workspace history.
- Query-count and grouping behavior are covered with model stubs rather than a
  live isolated Mongo integration harness.

Follow-up phases, not implemented: Phase 3 calendar-feed aggregation; Phase 4
reminder due-window batching; Phase 5 frontend partial-failure handling; Phase 6
shared due-row builder refactor.
