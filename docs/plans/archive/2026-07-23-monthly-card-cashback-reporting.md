# Monthly Card Cashback and Reporting

## Goal

Track bank-paid cashback independently for each credit card and calendar month,
then use that source in a later card-performance report without changing
transactions, statements, debt calculations, partner returns, or the existing
transaction cashback estimate.

## Phases

1. Add the monthly cashback model and authenticated, workspace-scoped API.
2. Add monthly cashback management to card detail.
3. Add time/card/owner reporting filters and the card-performance dashboard.

Repository policy permits one phase per iteration. All three phases were
completed in separate iterations.

## Phase 1 decisions

- A record is uniquely identified by `(workspaceId, userCardId, period)`, where
  `period` is a valid `YYYY-MM` calendar month.
- Amounts are non-negative integer VND.
- `RECEIVED` requires `actualAmount`; other statuses store it as `null`.
- `receivedAt` is set on the transition into `RECEIVED`, retained by idempotent
  updates while already received, and cleared when leaving that status.
- Historical entries remain available for inactive cards.
- Every route requires a signed session and first verifies that the card belongs
  to the session workspace. Records are workspace-scoped on every query and
  mutation.
- The Phase 1 API is:
  - `GET /api/cards/:cardId/monthly-cashbacks?year=YYYY`
  - `PUT /api/cards/:cardId/monthly-cashbacks/:period`
  - `DELETE /api/cards/:cardId/monthly-cashbacks/:period`

## Phase 1 validation plan

- Cover request validation, model uniqueness, idempotent upsert shape,
  workspace isolation, missing cards, status/amount transitions, and session
  enforcement without connecting to a database.
- Run the full backend validation.
- Run Git whitespace/status/stat/full-diff checks.

## Status

All three phases complete on `master`.

## Phase 1 implementation

Changed files:

- `backend/src/models/monthly-card-cashback.ts`: added the timestamped model,
  amount/status validation, lookup index, and unique
  `(workspaceId, userCardId, period)` index.
- `backend/src/monthly-card-cashback-routes.ts`: added the authenticated yearly
  list, idempotent month upsert, and delete routes with card/workspace checks.
- `backend/src/server.ts`: registered the new routes in the backend runtime.
- `backend/tests/monthly-card-cashback.test.ts`: added focused session,
  validation, index, upsert, transition, card-not-found, and workspace-scope
  coverage.
- `docs/README.md` and this plan: linked and recorded the active work.

Actual validation results:

- Focused Node 22 typecheck and lint: passed.
- Focused monthly cashback test: passed, 8 tests.
- `npm run validate` in the backend on Node 22: passed, including typecheck,
  lint, all 52 tests, and production TypeScript build.
- `git diff --check`: passed before the plan status update; final Git checks are
  run again before commit.

No database-backed test, migration, seed, smoke test, E2E, production database,
or frontend validation was run. Route tests use mocked Mongoose models, and the
unique index is asserted from schema metadata; isolated Mongo concurrency
coverage remains a future hardening opportunity. The collection will be
created by Mongoose when first used.

The host default is Node 16, below the repository's Node 22 runtime contract.
Validation therefore ran in the official `node:22-bookworm-slim` container.
`npm ci` reported one dependency audit finding; no dependency or lockfile was
changed because remediation is outside this phase.

## Phase 2 decisions

- Card detail owns a separate monthly cashback section; a cashback API failure
  does not fail the existing card/statement page load.
- The form defaults to the current calendar month and `PENDING`. Actual amount
  is enabled and required only for `RECEIVED`.
- Selecting a month loads that calendar year's history. History is sorted by
  period descending and provides edit/delete actions in both desktop table and
  mobile card layouts.
- Save uses the Phase 1 idempotent PUT contract. Save and confirmed delete both
  refresh history from the API.
- The UI explicitly states that bank cashback does not reduce debt, differs
  from partner returns, and is not added to transaction cashback estimates.
  Existing transaction cashback UI remains unchanged for reconciliation.

## Phase 2 implementation

Changed files:

- `frontend/lib/api/monthlyCashbacksCore.mjs` and its `.d.mts` declaration:
  added form/payload normalization, sorting, encoded GET/PUT/DELETE requests,
  and safe API error handling.
- `frontend/lib/api/monthlyCashbacksClient.ts`: added browser-facing monthly
  cashback types and client functions.
- `frontend/components/cards/MonthlyCashbackSection.tsx`: added loading, empty,
  error/retry, success, create/update, edit, confirmed delete, desktop, and
  mobile UI states.
- `frontend/app/cards/[id]/page.tsx`: mounted the independent monthly cashback
  section without changing statement or transaction behavior.
- `frontend/tests/monthlyCashbacks.test.mjs` and `frontend/package.json`: added
  the focused unit suite to the standard unit test command.

Actual validation results:

- Frontend typecheck on Node 22: passed.
- Frontend lint on Node 22: passed.
- Frontend tests on Node 22: passed, 62 unit tests and 6 integration tests.
  Five new tests cover defaults/status behavior, payload validation, history
  sorting/edit population, encoded API requests, API errors, mutation refresh,
  delete confirmation, and desktop/mobile render paths.
- Next.js 16.2.6 production build on Node 22: passed. The pre-existing
  middleware deprecation warning remains.
- Final Git whitespace/status/stat/full-diff checks are run before commit.

The local host still defaults to Node 16, so validation ran with the official
Node 22 container. The dependency gateway stalled full Next.js tarball
downloads; exact locked packages were restored locally via verified byte-range
downloads solely to run validation. No package version or lockfile changed.

No database, migration, seed, smoke, authenticated browser, Playwright, E2E, or
production-data check was run. Responsive behavior is covered structurally by
separate desktop table and mobile card render paths plus focused tests; a
browser visual pass remains optional hardening.

## Phase 3 decisions

- The existing unfiltered report remains an all-time report, and its legacy
  transaction cashback fields remain unchanged.
- `year`, `month`, `owner`, and `cardId` are optional filters. A month requires
  a year. Transactions use `transactionDate`; monthly bank cashback uses
  `period`.
- Cards matching the owner/card filters remain in the response with zero totals
  when they have no activity in the selected period.
- Monthly bank cashback expected includes `PENDING` and `RECEIVED`; actual
  includes only `RECEIVED`; rejected expected amounts are reported separately.
- Actual net benefit is monthly bank cashback actually received minus
  transaction service fees. Transaction cashback remains a reconciliation
  figure and is not added to the new KPIs.
- The report page supports all-time, yearly, and monthly views, owner/card
  selection, retryable loading errors, responsive card/table layouts, and JSON
  export using the same filters.

## Phase 3 implementation

Changed files:

- `backend/src/report-routes.ts`: added validated date/card filters,
  workspace-scoped monthly cashback aggregation, zero-data card rows, and the
  separate bank cashback and actual net benefit fields while preserving the
  existing response fields.
- `backend/tests/reports.test.ts`: added range, aggregation, rejection,
  no-double-counting, zero-data card, compatibility, workspace isolation, and
  invalid-filter coverage.
- `frontend/lib/api/reportsCore.mjs`, its `.d.mts` declaration, and
  `frontend/lib/api/reportsClient.ts`: added typed report filters, response
  types, filtered URLs, and safe request handling.
- `frontend/app/reports/page.tsx`: added the responsive performance dashboard,
  filters, KPIs, per-card details, loading/empty/error/retry states, and
  filtered JSON export.
- `frontend/app/cards/page.tsx`: added report navigation and made the existing
  JSON export preserve the owner filter.
- `frontend/tests/reports.test.mjs` and `frontend/package.json`: added report
  API/UI/navigation coverage to the standard unit suite.
- `README.md`, `docs/architecture/card-transaction-statement-model.md`, and
  `docs/architecture/domain-model.md`: documented the implemented cashback
  source, report filters, formulas, and compatibility behavior.

Actual validation results:

- Backend `npm run validate` on Node 22: passed, including typecheck, lint, all
  55 tests, and the production TypeScript build.
- Frontend typecheck and lint on Node 22: passed.
- Frontend tests on Node 22: passed, 66 unit tests and 6 integration tests.
- Next.js 16.2.6 production build on Node 22: passed and included the dynamic
  `/reports` route. The pre-existing middleware deprecation warning remains.
- Final Git whitespace/status/stat/full-diff checks are run before commit.

The host default remains Node 16, so validation ran in the official Node 22
container. No database-backed test, migration, seed, smoke, authenticated
browser, Playwright, E2E, or production-data check was run. Report route tests
mock Mongoose models; responsive behavior is covered structurally and by
focused render-source tests, so an authenticated browser visual pass remains
optional hardening.

No implementation phase remains. The plan is archived after final Git review
and the local Phase 3 commit; nothing is pushed.
