# Upcoming Payments Data Normalization

## Goal and phase

Fix the `/cards` “Danh sách thẻ sắp đến hạn” derivation so every valid current
payment with a finite remaining amount greater than zero is rendered, including
card-level fallback data when no persisted statement covers that period. Group
all rows by payment due month, sort deterministically, and avoid duplicates.
This is one data/business-logic bug-fix phase on
`ai-task/upcoming-payment-quick-actions`.

## Investigation scope

- Trace the batch statement API, backend serialization, frontend loading,
  normalization/filtering/grouping/sorting, and component rendering.
- Compare that flow with the card summary data shown below the table.
- Confirm the authoritative persisted-statement and card-fallback amount/date
  fields from the implementation before changing derivation.
- Check status filtering, date parsing, merging, deduplication, multi-month
  rendering, and layout clipping against the reported behavior.

## Intended constraints

- Preserve existing API routes, authentication, authorization, workspace
  scoping, and payment mutation contracts unless investigation proves a backend
  contract fix is required.
- Prefer a persisted statement for a card/payment period and use card data only
  as a fallback; never hardcode banks, cards, dates, or amounts.
- Include only items with a valid due date and a finite remaining amount greater
  than zero. A paid statement contributes zero remaining amount; partial payment
  contributes only its unpaid remainder.
- Group by normalized payment due month (`YYYY-MM`), render every group, and sort
  groups and rows ascending as required.
- Keep the current desktop table and responsive mobile presentation without
  fixed-height clipping.

## Planned validation

- Add focused tests for cross-bank/month data, fallback-only items, statement
  preference and deduplication, partial/full payment, numeric parsing, invalid
  dates, repeated cards/periods, deterministic sorting, and unordered input.
- Run validations appropriate to every changed package and a production
  frontend build.
- Run `git diff --check`, inspect status/stat, and review the full diff.

## Status

Implementation complete.

## Root cause and decisions

`GET /api/card-statements` already returns every persisted statement in the
workspace, including `OPEN` statements. The dashboard then passed those records
to `buildDueStatementGroups`, which discarded any row whose `statementDate` was
later than today. Sacombank's statements had already reached their statement
dates, while the reported UOB/VIB statements were still open with future
statement dates, so only Sacombank survived even though all payment due dates
and amounts were valid. There was no bank-specific mapping, backend finalized
status filter, month-render limit, name-based deduplication, or container height
clipping involved.

The normalized remaining amount is now `summary.totalAmountDue - paidAmount`
for an unpaid persisted statement, clamped at zero. `PAID` contributes zero.
This uses the actual statement contract; the current payment endpoint records
the full total in `paidAmount`, while the normalization also safely represents
partial persisted amounts.

The normalized source prefers persisted statements and merges the same
`cardSummaries` used by the lower card UI as fallback. Card fallback ultimately
uses the real legacy model fields `amountDueThisMonth`, `paymentDueDate`, and
`isPaidThisMonth` only when no selected persisted statement supplies the
period. A statement and fallback with the same `(cardId, normalized dueDate)`
produce one statement-backed row. Repeated statement API records are
deduplicated by statement `_id`; different periods for one card remain distinct.

Dates are explicitly normalized from `DD/MM/YYYY`, `YYYY-MM-DD`, or an ISO
datetime prefix and calendar-validated without parsing ambiguous date strings.
Only valid due dates with finite positive remaining amounts enter the result.
Rows group by normalized due month, groups sort by `YYYY-MM`, and rows sort by
due date, provider, card name, then stable key. Every group is rendered by the
existing responsive component. Fallback rows do not invent statement IDs or
offer persisted-statement mutations.

## Changed files

- `frontend/lib/cards/dueStatementsCore.mjs`: normalization, remaining amount,
  statement/card merge, filtering, deduplication, grouping, and sorting.
- `frontend/lib/cards/uiCore.mjs`: align lower-card summaries with remaining
  amounts and real card fallback fields while preferring a selected statement.
- `frontend/app/cards/page.tsx`: pass the filtered cards and their exact rendered
  summaries into upcoming-payment derivation.
- `frontend/components/cards/UpcomingPayments.tsx`: render normalized dates/keys
  and safe non-mutating fallback rows.
- `frontend/types/cardUi.d.ts`: normalized row and input declarations.
- `frontend/tests/dueStatements.test.mjs`, `frontend/tests/cardUi.test.mjs`:
  focused coverage for the required data cases.
- `docs/README.md` and this plan: active phase navigation and results.

No backend or shared contract file changed.

## Validation results

- `cd frontend && node --test tests/dueStatements.test.mjs tests/cardUi.test.mjs`:
  passed, 22 tests at that point.
- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm run lint`: passed.
- `cd frontend && npm test`: passed, 57 unit tests and 6 integration tests.
- `cd frontend && npm run build`: passed. The pre-existing middleware
  deprecation warning remains.

No database-backed, migration, seed, production-data, or authenticated API test
was run. Browser Playwright/visual E2E was skipped because this phase changes
derivation and tests both desktop/mobile render source paths without changing
their established responsive layout. Remaining operational risk is validation
against the authenticated deployed dataset after deployment; no production
database or session was accessed during this phase.
