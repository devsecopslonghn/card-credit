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

Repository policy permits one phase per iteration. Phase 1 and Phase 2 were
completed in separate iterations; Phase 3 has not started.

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

Phase 1 and Phase 2 complete on `master`.

Phase 3 has not started.

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

Remaining work is Phase 3: extend report aggregation and add the reporting
dashboard. It must begin in a separate iteration.
