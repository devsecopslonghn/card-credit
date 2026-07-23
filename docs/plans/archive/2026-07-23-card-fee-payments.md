# Card Fee Payments

## Goal

Record card fees only when money is actually charged, without requiring a fee
schedule, expected amount, payment status, or waived-fee record. Include those
paid fees in time-filtered card performance reports without changing
transactions, statements, debt, partner returns, or cashback data.

## User model

- A user enters a fee only after it has actually been charged.
- Each entry contains:
  - payment date;
  - positive integer VND amount;
  - optional note, such as `Phí thường niên` or `Phí quản lý quý 3`.
- Quarterly, annual, and irregular fees use the same record shape.
- A waived or uncharged fee has no record.
- Entries can be edited or deleted when entered incorrectly.
- The UI calls this source `Phí thẻ đã đóng` to avoid implying an annual
  schedule.

## Reporting formula

```text
actualNetBenefit =
  monthlyBankCashbackActual
  - totalServiceFee
  - totalPaidCardFees
```

`totalServiceFee` remains the transaction-derived difference between spending
and partner returns. `totalPaidCardFees` is a separate total and must not be
stored as a transaction or counted as spending.

## Phases

Repository policy permits one phase per iteration. Do not start a later phase
automatically.

### Phase 1 — Data model and API

- Add `CardFeePayment` with `workspaceId`, `userId`, `userCardId`,
  `paymentDate`, `amount`, `note`, and timestamps.
- Require a valid `YYYY-MM-DD` calendar date and a positive integer VND amount.
- Do not add recurrence, expected amount, fee category, status, or waived
  records.
- Keep historical fee entries available for inactive cards.
- Require a signed session and verify the card belongs to the session workspace
  before every read or mutation. Scope every record query by workspace and
  card.
- Add:
  - `GET /api/cards/:cardId/fee-payments`
  - `POST /api/cards/:cardId/fee-payments`
  - `PUT /api/cards/:cardId/fee-payments/:feePaymentId`
  - `DELETE /api/cards/:cardId/fee-payments/:feePaymentId`
- Return history newest first. An entry id, rather than date, identifies a
  record because multiple fees may be paid on the same day.
- Test validation, session enforcement, card/payment not found, workspace
  isolation, inactive-card history, create/update/delete query scope, and
  ordering.
- Run the full backend validation and final Git checks.
- Proposed commit:
  `feat(fees): add paid card fee API`

### Phase 2 — Card-detail entry UI

- Add frontend types and an API client for paid card fees.
- Add a `Phí thẻ đã đóng` section to `/cards/[id]` with:
  - payment date defaulting to today;
  - amount;
  - optional note;
  - save, edit, and confirmed delete actions;
  - history newest first;
  - loading, empty, error, retry, and mutation feedback;
  - desktop and mobile layouts.
- Explain that users enter a row only when the bank actually charges a fee;
  waived fees and fee schedules are not entered.
- Keep this section independent from the existing card, statement, transaction,
  and monthly cashback load states.
- Test form validation/payloads, history rendering, edit/delete, API errors,
  refresh after mutation, and responsive render paths.
- Run frontend typecheck, lint, tests, production build, and final Git checks.
- Proposed commit:
  `feat(fees): manage paid fees in card detail`

### Phase 3 — Report integration

- Extend `GET /api/reports/summary` compatibly:
  - preserve all existing fields;
  - filter paid card fees by `paymentDate` using the existing all-time,
    year/month, owner, and card filters;
  - add `totalPaidCardFees` per card and in aggregate;
  - update `actualNetBenefit` to subtract both transaction service fees and paid
    card fees.
- Keep cards with no data in the selected period visible with zero fee totals
  when they match owner/card filters.
- Update `/reports` with:
  - a `Phí thẻ đã đóng` KPI;
  - a separate paid-fee column/metric for each card;
  - labels or help text that distinguish transaction service fees from paid
    card fees;
  - the updated actual net benefit.
- Keep filtered JSON export using the same report contract.
- Test date ranges, multi-card aggregation, workspace isolation, zero-data
  cards, compatibility, and the absence of double counting with transactions.
- Update the root README and current architecture documentation.
- Run backend validation, frontend typecheck/lint/tests/build, and final Git
  whitespace/status/stat/full-diff review.
- Proposed commit:
  `feat(reports): include paid card fees`

## Status

All three phases complete on `master`.

## Phase 1 decisions

- Each actual charge is a separate record with its own id, so multiple charges
  can share one payment date.
- The payment date is stored as a calendar `YYYY-MM-DD` string and is validated
  as a real UTC calendar date.
- Amounts must be positive safe integers. Notes are trimmed and limited to 1000
  characters.
- History is sorted by payment date and creation time, newest first.
- Inactive cards retain history. Every card and fee lookup is scoped to the
  signed session workspace; cross-workspace records are indistinguishable from
  missing records.

## Phase 1 implementation

Changed files:

- `backend/src/models/card-fee-payment.ts`: added the timestamped paid-fee
  model and workspace/card/date lookup index.
- `backend/src/card-fee-payment-routes.ts`: added authenticated list, create,
  update, and delete routes with validation and workspace/card ownership checks.
- `backend/src/server.ts`: registered the paid-fee routes.
- `backend/tests/card-fee-payments.test.ts`: added focused session, validation,
  inactive-card history, sorting, mutation scope, and not-found coverage.
- `docs/architecture/card-transaction-statement-model.md`: documented the
  implemented source and its independence from transactions and debt.
- `docs/README.md` and this plan: linked and recorded the active work.

Actual validation results:

- Backend `npm run validate` on Node 22: passed, including typecheck, lint, all
  63 tests, and the production TypeScript build.
- Eight new paid-fee tests passed.
- Final Git whitespace/status/stat/full-diff checks are run before commit.

No database-backed test, migration, seed, smoke, frontend validation, browser,
Playwright, E2E, or production-data check was run. Mongoose will create the new
collection when first used. Route tests mock Mongoose models; an isolated Mongo
integration test remains optional hardening.

The host default remains below the repository's Node 22 contract, so validation
ran in the official `node:22-bookworm-slim` container.

## Phase 2 decisions

- Paid-fee management is an independent card-detail section; its API failure
  does not fail the existing card, statement, transaction, or cashback views.
- The form defaults to the user's current local date. A blank record uses POST;
  editing a history row retains its id and uses PUT.
- Successful create/update/delete refreshes history. A successful save returns
  the form to a new entry; deleting the entry being edited also resets it.
- History is sorted newest first and provides confirmed delete plus separate
  desktop table and mobile card layouts.
- The UI explicitly says to enter only fees actually charged and to omit waived
  fees and recurrence schedules.

## Phase 2 implementation

Changed files:

- `frontend/lib/api/cardFeePaymentsCore.mjs` and its `.d.mts` declaration:
  added local-date defaults, form/payload validation, stable sorting, encoded
  list/create/update/delete requests, and safe API errors.
- `frontend/lib/api/cardFeePaymentsClient.ts`: added browser-facing paid-fee
  types and client functions.
- `frontend/components/cards/CardFeePaymentSection.tsx`: added loading, empty,
  error/retry, success, create/update, edit, confirmed delete, desktop, and
  mobile UI states.
- `frontend/app/cards/[id]/page.tsx`: mounted the independent paid-fee section.
- `frontend/tests/cardFeePayments.test.mjs` and `frontend/package.json`: added
  four focused tests to the standard unit suite.

Actual validation results:

- Frontend typecheck on Node 22: passed.
- Frontend lint on Node 22: passed.
- Frontend tests on Node 22: passed, 70 unit tests and 6 integration tests.
- Next.js 16.2.6 production build on Node 22: passed and retained the dynamic
  card-detail and report routes. The pre-existing middleware deprecation
  warning remains.
- Final Git whitespace/status/stat/full-diff checks are run before commit.

The dependency gateway stalled the full Next.js tarball. The exact locked
Next.js 16.2.6 tarball was restored to the local npm cache through verified
byte-range downloads; `npm ci --offline` then installed the lockfile without
changing package versions or the lockfile.

No database, migration, seed, smoke, authenticated browser, Playwright, E2E, or
production-data check was run. Responsive behavior is covered structurally and
by focused source tests; an authenticated browser visual pass remains optional
hardening.

## Phase 3 decisions

- Paid card fees use the same all-time/year/month/owner/card report selection,
  with calendar filtering on `paymentDate`.
- `totalPaidCardFees` is added per card and in aggregate without changing or
  reinterpreting existing transaction totals.
- Actual net benefit is bank cashback actually received minus both
  transaction-derived service fees and paid card fees.
- Report labels keep transaction service fees and manually entered paid card
  fees visibly separate.

## Phase 3 implementation

Changed files:

- `backend/src/report-routes.ts`: added workspace/card/date-scoped paid-fee
  loading, per-card/aggregate totals, zero-data defaults, and the updated net
  benefit formula.
- `backend/tests/reports.test.ts`: extended month/year/all-time, multi-card,
  workspace-scope, zero-data, compatibility, and no-double-counting assertions.
- `frontend/lib/api/reportsCore.d.mts`: extended the compatible report type with
  `totalPaidCardFees`.
- `frontend/app/reports/page.tsx`: added the paid-fee KPI and per-card desktop
  and mobile metrics, with clearer separation from transaction service fees.
- `frontend/tests/reports.test.mjs`: extended the report source-render
  assertions.
- `README.md`, `docs/architecture/card-transaction-statement-model.md`, and
  `docs/architecture/domain-model.md`: documented the implemented input rule,
  date filter, new total, and final formula.

Actual validation results:

- Backend `npm run validate` on Node 22: passed, including typecheck, lint, all
  63 tests, and the production TypeScript build.
- Frontend typecheck and lint on Node 22: passed.
- Frontend tests on Node 22: passed, 70 unit tests and 6 integration tests.
- Next.js 16.2.6 production build on Node 22: passed and included dynamic
  `/cards/[id]` and `/reports` routes. The pre-existing middleware deprecation
  warning remains.
- One initial frontend source-render assertion failed because the unchanged
  zero-data sentence gained a JSX line break; the assertion was made
  whitespace-tolerant and the complete frontend validation then passed.
- Final Git whitespace/status/stat/full-diff checks are run before commit.

No database-backed test, migration, seed, smoke, authenticated browser,
Playwright, E2E, or production-data check was run. Report route tests mock
Mongoose models; an isolated Mongo integration and authenticated browser visual
pass remain optional hardening.

No implementation phase remains. The completed plan is archived with the final
Phase 3 commit; nothing is pushed.

## Risks and non-goals

- This plan does not forecast upcoming fees or remind users about fee dates.
- It does not infer fee recurrence from history.
- It does not create zero-value waived-fee records.
- It does not alter statement debt or automatically extract fees from statement
  transactions.
- Manual entry can duplicate a fee already represented elsewhere; the UI and
  report labels must make the separate source explicit.
