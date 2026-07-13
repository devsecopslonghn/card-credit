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

All six phases are complete. No follow-up phase remains in this plan.

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

Complete on `ai-task/upcoming-payment-quick-actions`; ready to archive.

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

Follow-up phases at the end of Phase 2: Phase 3 calendar-feed aggregation;
Phase 4 reminder due-window batching; Phase 5 frontend partial-failure handling;
Phase 6 shared due-row builder refactor.

## Phase 3 implementation record

Changed files:

- `backend/src/calendar-subscription-routes.ts`: replace one amount aggregation
  per statement with one batch aggregation and map grouped totals back to the
  existing ordered calendar inputs.
- `backend/tests/calendar-subscription.test.ts`: add a valid-feed route regression
  covering multiple statement amounts, one aggregate call, exact pipeline
  shape, and workspace scoping.
- This plan: record Phase 3 decisions, validation, and remaining risks.

Implementation decisions:

- The batch pipeline matches both `workspaceId` and all eligible statement IDs,
  then groups by `statementId`. This is stricter than the previous statement-ID-
  only lookup while preserving the already-authorized feed set.
- Statement ordering remains the existing ascending `paymentDueDate` order; only
  amount lookup changed.
- Statements without a matching aggregate total continue to use `0`.
- An empty statement list skips aggregation entirely.
- Token lookup, opaque 404 behavior, account/card ownership checks, feed headers,
  alarm projection, and best-effort `lastAccessedAt` update are unchanged.

Validation results:

- `cd backend && node --import tsx tests/calendar-subscription.test.ts`: passed
  all five focused tests. The first focused run exposed an overly strict test
  assertion for the locale-specific currency spacing; the assertion was made
  stable without changing production behavior.
- `cd backend && npm run validate`: passed; typecheck, lint, all 15 backend test
  files, and build passed.

Skipped checks:

- Shared and frontend validation were skipped because neither runtime contract
  nor frontend code changed.
- Live calendar polling, Playwright/E2E, and database-backed smoke tests were
  skipped. Route coverage uses isolated model stubs and no production database
  was accessed.

Blockers: none.

Remaining risks:

- Pipeline behavior and query count are verified with model stubs rather than an
  isolated Mongo integration test.
- Very large subscription histories still produce an unpaginated statement-ID
  array and feed; Phase 3 removes N+1 aggregation but does not bound feed size.

Follow-up phases at the end of Phase 3: Phase 4 reminder due-window batching;
Phase 5 frontend partial-failure handling; Phase 6 shared due-row builder
refactor.

## Phase 4 implementation record

Changed files:

- `backend/src/payment-reminder.ts`: add a timezone-aware helper that derives the
  exact candidate due date for a local scan date and reminder offset.
- `backend/src/reminder-scheduler.ts`: query statements once for enabled card
  IDs, workspaces, and exact candidate due dates; batch workspace-owner fallback
  and statement totals; deduplicate account reads within the scan.
- `backend/tests/payment-reminder.test.ts`: cover timezone due-date derivation,
  exact statement query filters, one statement query, one totals aggregation,
  batch workspace fallback, deduplicated user reads, claims, updates, and
  per-statement email amounts.
- This plan: record Phase 4 decisions, validation, and remaining risks.

Implementation decisions:

- The scheduler still begins from enabled active cards because reminder offsets,
  timezone, and local send time are card-owned configuration. It derives the
  finite set of possible due dates before querying statements instead of loading
  every unpaid statement per card.
- One statement query is constrained by workspace IDs, card IDs, unpaid status,
  and exact due-date values. The existing `reminderIsDue` check remains the final
  authority for card timezone/send-time eligibility.
- Workspace fallback owners are loaded in one `$in` query. Direct and fallback
  owner accounts are memoized by user ID within the scan, so multiple eligible
  deliveries for one owner perform one repository read.
- Eligible statement totals use one workspace-scoped aggregation grouped by
  statement ID. Missing totals remain `0`.
- Atomic delivery claim, uniqueness, lease recovery, retry count/backoff,
  terminal status behavior, recipient validation, safe logging, and SMTP error
  handling are unchanged.

Validation results:

- `cd backend && node --import tsx tests/payment-reminder.test.ts`: passed all
  four focused tests after adding batch fallback coverage.
- The first full validation attempt reached lint and found two unused mock
  parameters; the test callback was simplified without production changes.
- `cd backend && npm run validate`: passed after that correction; typecheck,
  lint, all 15 backend test files, and build passed.

Skipped checks:

- Shared and frontend validation were skipped because contracts and frontend
  code were unchanged.
- Real SMTP, deployed scheduler, timer-driven soak tests, and database-backed
  concurrency tests were skipped. Tests use an injected clock and isolated model
  stubs; no production database was accessed.

Blockers: none.

Remaining risks:

- Claims remain per delivery to preserve atomic uniqueness; this phase batches
  candidate discovery and related reads, not the claim/write operations.
- Account lookup is deduplicated per unique owner but the current auth repository
  has no multi-ID method, so distinct owners still require distinct reads.
- Totals are aggregated before individual claims, so a scan with only already-
  terminal delivery records may perform one unnecessary aggregate query.
- The documented SMTP-accepted/database-not-marked-sent duplicate risk is
  unchanged.

Follow-up phases at the end of Phase 4: Phase 5 frontend partial-failure
handling; Phase 6 shared due-row builder refactor.

## Phase 5 implementation record

Changed files:

- `frontend/lib/cards/dashboardLoadCore.mjs` and `.d.mts`: add a pure typed
  resource loader using `Promise.allSettled`, stable error normalization, and
  explicit empty results for failed resources.
- `frontend/app/cards/page.tsx`: load cards and statements concurrently, replace
  both state slices on every attempt, keep successful cards visible when
  statements fail, and render an accessible warning/retry action.
- `frontend/tests/dashboardLoad.test.mjs`: cover both-success, each independent
  failure, both-failure, custom messages, and stable fallback messages.
- `frontend/tests/dueStatements.test.mjs`: update dashboard source wiring
  regressions for the partial loader and independent statement error state.
- `frontend/package.json`: include the new focused test in the unit suite.
- This plan: record Phase 5 decisions, validation, and remaining risks.

Implementation decisions:

- Cards and statements start concurrently and settle independently. A failed
  resource becomes `[]` rather than retaining stale data from a previous load.
- A card failure continues to use the existing blocking card-list error panel.
  A statement failure leaves successfully loaded cards available and displays a
  separate `role="alert"` warning that due/payment data is incomplete.
- Upcoming payments and statement-backed transaction form data become empty on
  statement failure, preventing actions against stale statement IDs.
- Retry reloads both resources to restore a coherent current snapshot. Phase 5
  does not add background retries, caching, or backend changes.

Validation results:

- Focused dashboard-loader and due-statement tests passed after updating one
  Phase 2 source assertion from a direct function call to the new loader wiring.
- `cd frontend && npm run typecheck && npm run lint && npm test`: passed; all
  nine unit test files and one integration test file passed.
- The sandboxed production build failed only because Google Fonts were
  unreachable. The approved `cd frontend && npm run build` networked rerun
  passed compile, TypeScript, and all route generation. The pre-existing
  middleware deprecation warning remains.

Skipped checks:

- Backend and shared validation were skipped because those runtimes and
  contracts were unchanged.
- Playwright/browser interaction and live API failure injection were skipped;
  the repository has no component DOM harness for this page. Pure resource
  behavior and source wiring are covered without network or database access.

Blockers: none.

Remaining risks:

- When statements fail, card shells remain useful but their statement-derived
  summaries use empty statement data; the visible warning explicitly marks
  balances and payment periods as incomplete.
- Browser-level focus behavior for the warning retry button remains unverified.

Follow-up phase at the end of Phase 5: Phase 6 shared due-row builder refactor.

## Phase 6 implementation record

Changed files:

- `frontend/lib/cards/dueStatementsCore.mjs`: add `buildStatementRows()` and use
  it for both upcoming groups and overdue rows.
- `frontend/tests/dueStatements.test.mjs`: cover shared card resolution, orphan
  exclusion, numeric amount normalization, and status derivation.
- `docs/README.md` and this plan: move the completed workstream from active to
  historical documentation.

Implementation decisions:

- Only the duplicated projection step was shared. Upcoming and overdue filters
  and sort policies remain separate because they express different behavior.
- The helper builds the card lookup once, excludes statements whose card is not
  present, normalizes `totalAmountDue` with `Number`, and calculates status once
  per retained row.
- Existing output shapes, month grouping, due counts/amounts, sorting, paid/
  overdue/future filters, and default `today` behavior are unchanged.

Validation results:

- `cd frontend && node --test tests/dueStatements.test.mjs`: passed.
- `cd frontend && npm run typecheck && npm run lint && npm test`: passed; all
  nine unit test files and one integration test file passed.
- The sandboxed build failed only because Google Fonts were unreachable. The
  approved `cd frontend && npm run build` networked rerun passed compile,
  TypeScript, and all route generation. The pre-existing middleware deprecation
  warning remains.
- Final Git checks and diff review are recorded before the Phase 6 commit.

Skipped checks:

- Backend and shared validation were skipped because those runtimes and
  contracts were unchanged.
- Playwright/E2E and live API/database checks were skipped because this phase is
  a pure frontend projection refactor with unit coverage.

Blockers: none.

Remaining risks across the completed plan:

- Batch endpoints and aggregations remain unpaginated for very large histories.
- Database query behavior is covered by model stubs rather than an isolated
  Mongo integration harness.
- Reminder claims remain per delivery, distinct owners still require distinct
  auth repository reads, and the SMTP/database exactly-once gap remains.
- Browser-level partial-failure focus/layout behavior remains unverified by E2E.

Relevant commits:

- `a4e64cd` — transaction PATCH correctness and list reference batching.
- `f6bd27b` — dashboard statement batching.
- `fa95ee9` — calendar feed total batching.
- `5560b31` — reminder scheduler due-window batching.
- `4811c20` — dashboard partial-load handling.
- Phase 6 due-row refactor and archival are committed together after this final
  record.
