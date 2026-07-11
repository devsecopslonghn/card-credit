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
commit `2f616df`; the working tree was clean before Phase 2 started.
