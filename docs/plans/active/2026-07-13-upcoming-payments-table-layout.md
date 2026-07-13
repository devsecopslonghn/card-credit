# Upcoming Payments Table Layout

## Goal and scope

Make the desktop “Danh sách thẻ sắp đến hạn” table compact, aligned, and easy
to scan without changing data derivation, payment mutations, labels, API calls,
or the existing mobile card presentation. This is one frontend-only styling
phase on `ai-task/upcoming-payment-quick-actions`.

## Decisions

- Keep the stacked card presentation below `xl`; eight columns are not a useful
  table at tablet widths.
- Use a fixed-layout table with proportional columns so card names and actions
  receive space while date/amount/status values remain on one line. Longer
  headers may use a controlled two-line label instead of colliding with the
  adjacent column.
- Standardize body typography at `text-sm`/`leading-5`/medium, reserving
  semibold for card name, due date, and amount.
- Align card/provider left, owner/dates/status/actions center, and amount right.
- Vertically center every desktop cell and clamp only the card name to two
  lines; provider text truncates with its full value available as a title.
- Keep both desktop action buttons in a compact vertical action stack with equal
  full width, height, padding, radius, centered text, and no wrapping. The
  measured content width is about 1108 px at both requested desktop viewports,
  so a horizontal pair clips the longer unchanged label.

## Planned validation

- Frontend typecheck and lint.
- Focused due-statement tests and production build.
- Visual checks at 1280 px, 1440 px, and mobile.
- `git diff --check`, status/stat inspection, and full diff review.

## Status

Implementation complete. Changed files are limited to
`frontend/components/cards/UpcomingPayments.tsx`, its focused test, docs
navigation, and this plan.

Validation results:

- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm run lint`: passed.
- `cd frontend && node --test tests/dueStatements.test.mjs`: passed.
- `cd frontend && npm run build`: passed; the pre-existing middleware
  deprecation warning remains.
- Playwright with local mocked API data at 1280x900 and 1440x1000: table width
  1108 px, document scroll width equals viewport width, rows are consistently
  101 px, and both buttons are 231x36 px with nowrap and no content clipping.
- Playwright at 390x844: desktop table is hidden, stacked card layout is shown,
  and document scroll width equals viewport width.

No API, data loading, statement derivation, mutation behavior, backend/shared
code, or production data was touched. Browser checks used local mock responses;
no authenticated real-environment mutation or E2E test was needed for this
style-only phase.
