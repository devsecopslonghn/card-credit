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

Repository policy permits one phase per iteration. This iteration is limited to
Phase 1 and stops before frontend work.

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

Phase 1 complete on `master`.

Phases 2 and 3 have not started.

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

Remaining work is Phase 2: add frontend types/client and monthly cashback
management to card detail. It must begin in a separate iteration.
