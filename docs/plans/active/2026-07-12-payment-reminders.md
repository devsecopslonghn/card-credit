# Automatic Payment Reminders

## Problem statement

Card owners need opt-in email reminders at multiple configurable offsets before
each persisted statement payment due date. A reminder must go only to the
authoritative account that owns the card and must not be sent twice for the same
statement and offset.

## Product decisions

- Preferences are stored per card: enabled, reminder day offsets, IANA timezone,
  and local send time.
- Defaults are disabled, `[7, 3, 1]`, `Asia/Ho_Chi_Minh`, and `08:00`.
- Recipient is resolved from `CreditCard.userId`, with an explicit workspace
  `ownerUserId` as the legacy-card fallback. `CreditCard.owner` remains
  display-only and is never treated as an address. Missing or invalid ownership
  causes a safe skip; the scheduler never guesses an owner.
- Only unpaid persisted statements are eligible. Phase 1 manual calendar email
  remains unchanged.

## Architecture decision

Use a lightweight scheduler in the existing backend process to minimize runtime
and deployment changes. Each scan derives eligible reminders from cards and
statements, atomically claims a unique Mongo delivery record, sends through the
existing mail abstraction, and records success/failure. Atomic uniqueness makes
multiple scans safe. A future scale-out should extract this runner to a dedicated
worker without changing the persistence contract.

## API and data contract

Card operational create/update/read contracts gain `reminderEnabled`,
`reminderDaysBefore`, `reminderTimezone`, and `reminderTime`. Existing card
authorization and workspace scoping remain authoritative. No endpoint accepts a
recipient.

Delivery records use a unique `(workspaceId, statementId, daysBefore)` key and
store status, attempt count, next attempt time, timestamps, and a safe failure
code. They never store credentials, email bodies, or a recipient address.

## Scheduling and retry behavior

The backend scans on a configurable interval, disabled in tests unless started
explicitly. It compares each card's local date/time with statement due dates,
claims reminders at their configured offset, and skips paid statements. Failed
SMTP submissions are retried with bounded backoff up to three attempts. A
successful unique delivery is never sent again.

## Security and failure handling

Account lookup must succeed, be active/unlocked, match the card workspace, and
have a valid normalized email. Workspace fallback ownership must be explicit;
missing workspace/card ownership is skipped without sending. Logs use masked
recipients and safe IDs only.
Invalid preferences are rejected; invalid legacy records are skipped safely.
Scheduler failures do not stop the HTTP server.

## Testing and validation

Unit tests cover preference validation, timezone/local scheduling, eligibility,
idempotency and retry decisions. Route/UI tests cover per-card configuration.
Runner tests use fake repositories, clocks and mail services; no real SMTP or
production MongoDB is used. Run shared/backend/frontend validations, production
builds, Compose checks, `git diff --check`, and final diff review.

## Risks and future work

An in-process scheduler is the least disruptive option but shares lifecycle with
the API. Mongo atomic claims protect duplicate delivery, while a dedicated worker
is still recommended if backend replicas or scheduling volume increase. Email
verification and a generic backend rate limiter remain unavailable.

## Current implementation status

In progress on `ai-task/email-statement-calendar`. Phase 1 was archived after
commit `2f616df`; Phase 2 started from clean commit `3bbd580`.

Implementation decisions recorded during work:

- The scheduler starts after HTTP listen and runs in the same backend process;
  tests do not start it automatically.
- Delivery uniqueness is `(workspaceId, statementId, daysBefore)`. Claiming uses
  one MongoDB `findOneAndUpdate`, and terminal `SENT`/`SKIPPED` rows cannot be
  reclaimed.
- Retry delays are bounded at 1, 5, and 30 minutes; the third failed attempt is
  terminal. Provider errors are reduced to `SMTP_SUBMISSION_FAILED`.
- Legacy fallback reads only persisted `Workspace.ownerUserId`; missing or
  unusable ownership becomes `RECIPIENT_UNAVAILABLE` without sending.

Files changed so far: card/reminder/workspace/delivery models, centralized
preference and scheduling logic, SMTP mail implementation, backend startup
configuration, card API contract, card-detail UI, and reminder unit tests.

Validation results:

- `cd shared && npm run validate`: passed.
- `cd backend && npm run validate`: passed (32 tests).
- `cd frontend && npm run typecheck && npm run lint && npm test && npm run build`:
  passed (47 tests; Phase 1 regression included).
- Production Compose `config --quiet` and `build` with invalid/placeholder
  MongoDB and SMTP values: passed; no service was started and no connection was
  made.
- `git diff --check`: passed.

Skipped checks: Playwright, deployed scheduler smoke tests, real SMTP, and any
database-backed test. Real SMTP and production MongoDB are intentionally
forbidden; the repository currently has no isolated Mongo integration harness
for delivery concurrency.

Remaining risks and implementation status: runtime implementation is complete.
Unit coverage exists for
preferences, timezone/offset, bounded backoff, composition, and all existing
Phase 1 behavior. Database-backed tests for atomic concurrent claim, unique
idempotency, exactly-once success, paid/ownership/account skip cases, max retry,
scheduler isolation, workspace routes, and frontend interaction behavior remain
deferred by product direction for later hardening. Claims now use a configurable
five-minute lease and expired claims can be reclaimed while terminal deliveries
remain closed. Because SMTP and MongoDB cannot share a transaction, a crash after
SMTP acceptance but before marking `SENT` can still cause a later duplicate;
this residual delivery risk must remain documented and monitored.

Latest completion validation: `cd backend && npm run validate` passed with 32
tests, and production Compose `config --quiet` passed with non-production
Mongo/Auth/SMTP placeholders. Frontend was unchanged in this completion batch.

## Manual calendar scope adjustment

On 2026-07-12 the manual Phase 1 attachment was narrowed by product decision:
each `.ics` now contains exactly one all-day payment-due event. It no longer
creates a statement-close event. The endpoint, authoritative recipient rules,
SMTP transport, one-time import behavior, and reminder scheduler are unchanged.
