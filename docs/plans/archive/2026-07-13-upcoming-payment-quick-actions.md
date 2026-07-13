# Upcoming Payment Quick Actions

## Goal

Expose statement close and payment-complete actions directly in the `/cards`
upcoming-payments area, using the persisted statement and existing payment API.

## Scope and decisions

- This is one frontend-only phase on `ai-task/upcoming-payment-quick-actions`.
- Reuse `PATCH /api/cards/:cardId/statements/:statementId/payment`; do not change
  backend contracts, authentication, authorization, or workspace scoping.
- Every mutation uses the row's persisted `statement._id` and `userCardId`.
- Pending state is keyed by statement and action, with an in-flight guard against
  duplicate submission.
- Closing requires the same irreversible-action confirmation used by card detail.
- Successful mutations replace the statement in page state, allowing rows,
  statuses, card summaries, due counts, and due amounts to derive again.

## Planned files

- `frontend/app/cards/page.tsx`
- `frontend/components/cards/UpcomingPayments.tsx`
- `frontend/tests/dueStatements.test.mjs`
- This active plan and documentation navigation.

## Validation plan

- Frontend typecheck, lint, focused/unit tests, and production build.
- `git diff --check`, status/stat inspection, and full diff review.
- Backend/shared validation is not required unless implementation discovers a
  contract or endpoint change.

## Status

Phase complete on `ai-task/upcoming-payment-quick-actions`. No backend or shared
contract change was required.

Changed files:

- `frontend/app/cards/page.tsx`: statement/action-keyed mutation state,
  double-submit guard, existing API call, immediate state replacement, and toast
  handling.
- `frontend/components/cards/UpcomingPayments.tsx`: desktop action column,
  stacked mobile actions, state-aware labels, and independent disabled/loading
  behavior.
- `frontend/tests/dueStatements.test.mjs`: coverage for rendered states,
  persisted identifiers, pending guard, success replacement, and failure toast.
- `docs/README.md` and this plan: active-work navigation and phase record.

Validation results:

- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm run lint`: passed.
- `cd frontend && npm test`: passed (8 unit files and 1 integration file).
- `cd frontend && npm run build`: passed. The first sandboxed attempt failed
  because Google Fonts network access was unavailable; the approved networked
  rerun compiled, typechecked, and generated all routes successfully.

Skipped checks:

- Backend/shared validation: skipped because no endpoint, contract, server
  authorization, or shared code changed.
- Playwright/E2E and live API/database smoke tests: skipped; the repository's
  unit setup covers source/state wiring but has no component interaction DOM
  harness, and no isolated database was needed for this frontend-only reuse.

Remaining risks:

- Browser-level focus/layout behavior and a real authenticated mutation remain
  unverified by E2E. Existing backend route checks continue to enforce card,
  persisted statement, and workspace ownership.
- The Next.js build still reports the pre-existing middleware deprecation
  warning.
