# Email Statement Calendar

## Problem statement

An authenticated account owner needs a one-click way to email a one-time
iCalendar attachment for an existing persisted credit-card statement. The
browser must never choose the recipient and `CardStatement` remains the
financial source of truth.

## Current repository behavior

The Next.js frontend calls the Fastify backend through the existing same-origin
`/api/cards/:path*` rewrite. Statements are persisted in MongoDB and displayed
on the card detail page. There was no SMTP transport, calendar export, delivery
history, backend rate limiter, or email-verification state before this work.

## Authentication and account-email findings

The signed session contains `userId`, email, role, and workspace, but the users
collection is authoritative. The feature resolves the current user again by
`session.userId`, requires an active/unlocked account in the same workspace,
normalizes its login email to lowercase, and ignores all browser recipient data.
The repository does not currently model email verification, so this phase does
not invent a verification flag.

## Current card and statement data flow

Cards and statements are queried with `workspaceId`; a statement also carries
`userCardId`. Transaction summaries and effective overdue status are derived by
the existing statement domain. The calendar route preserves these rules and
requires the requested statement to match both the requested card and workspace.

## Product decision

Add `Gửi lịch qua email` to one selected persisted statement. It sends one
message to the current account login email only after an explicit click. This is
a one-time import, not continuous synchronization.

## Architecture decision

Keep statement projection, iCalendar serialization, email composition, SMTP
transport, HTTP handling, and frontend pending/notification state separate.
The route depends on an injectable `MailService`; automated tests use a fake.
Nodemailer (MIT) is a focused backend-only SMTP dependency.

## API contract

`POST /api/cards/:cardId/statements/:statementId/calendar-email` requires the
existing session cookie and no request body. Success is
`{ "data": { "sent": true, "recipient": "l***@example.com" } }`.
Responses use 400 for an unusable authoritative email, 401 for no session, 404
for inaccessible/mismatched resources, 502 for SMTP submission failure, and 503
for missing/invalid SMTP runtime configuration.

## iCalendar design

One UTF-8 `.ics` attachment contains exactly two all-day events: statement close
and payment due. Dates remain date-only; `DTEND` is the exclusive next UTC
calendar day. UIDs are stable SHA-256 projections of internal identity and event
type and expose no raw IDs. Output uses CRLF, RFC escaping/folding, Vietnamese
text, `VERSION:2.0`, Gregorian scale, and `METHOD:PUBLISH`.

## SMTP environment handling

Runtime variables are `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASSWORD`, and `SMTP_FROM_ADDRESS`. A separate port wins over a trailing
host port; otherwise port 587 is the default. Port 465 defaults to implicit TLS,
587 to STARTTLS-compatible `secure: false`. Explicit secure values are strict
booleans. Invalid or missing settings produce a secret-free unavailable error.
Transport initialization is lazy and has bounded connection, greeting, and
socket timeouts with no automatic retry.

## Jenkins-agent environment handling

SMTP values are inherited from the selected Jenkins agent through the shell and
Docker Compose interpolation. This phase adds no SMTP Jenkins Credentials,
`withCredentials`, generated env file, build argument, value logging, or secret
hard-coding. Existing MongoDB/Auth credential bindings are unchanged.

## Docker runtime injection

Compose passes SMTP variables only to the backend container. They are not sent
to the frontend and are never used during image builds. The temporary
`SMTP_HOST=host:port` format is supported.

## Security considerations

The authoritative recipient cannot be overridden by body, query, headers, card,
or statement metadata. Workspace-scoped lookup prevents existence disclosure.
Logs and responses omit full recipient addresses, SMTP/provider details,
credentials, calendar bodies, financial descriptions, and internal IDs. Header
and attachment filename inputs are sanitized. No TLS verification is disabled.

## Failure handling

SMTP configuration and provider failures are mapped to safe 503/502 responses.
One request invokes the mail service once and is never retried. The UI disables
the action while pending and a later explicit click may send again. There is no
backend rate limiter in the current repository; adding a new dependency solely
for this phase is intentionally avoided.

## Testing strategy

Unit tests cover projection, date boundaries, escaping/folding, stable UIDs,
email composition, filename/header safety, SMTP parsing, and secret-free errors.
Route tests cover authentication, authoritative account resolution, workspace
isolation, override attempts, exactly-once delivery, masking, and safe failures.
Frontend tests cover eligibility and the bodyless POST client. No automated test
uses real SMTP or production MongoDB.

## Validation checklist

- Shared validation.
- Backend typecheck, lint, tests, and build.
- Frontend typecheck, lint, tests, and production build.
- Compose validation/build with non-secret placeholders.
- Relevant isolated Playwright checks when a fake SMTP runtime is available.
- `git diff --check`, status/stat, and full diff review.

## Deployment notes

The backend service must receive all required SMTP variables from the Jenkins
agent. A manual smoke test is optional and must use one explicitly approved test
account without printing secrets. Future operations should split host/port and
migrate SMTP secrets to Jenkins Credentials.

## Risks

There is no email-verification state, server-side rate limiter, retry queue, or
delivery receipt/history. SMTP acceptance does not prove inbox delivery. Global
Jenkins node environment variables are a temporary secret-management approach.

## Future phases

Phase 2 may add reminder preferences, scheduler/idempotency/retries/history.
Phase 3 may add revocable private read-only iCalendar subscriptions. Phase 4 may
migrate SMTP secrets to Jenkins Credentials while preserving the container env
contract. None is implemented here.

## Current implementation status

Implemented on branch `ai-task/email-statement-calendar`. Initial working tree
was clean. Added the authenticated route, authoritative account lookup,
workspace-scoped statement projection, iCalendar serializer, email composer,
lazy Nodemailer SMTP service, frontend action, runtime injection, documentation,
and automated tests. No files were deleted and no Jenkinsfile change was needed:
the existing agent shell already preserves node environment variables for
Compose, so no SMTP credential binding was introduced.

Validation completed successfully:

- `cd shared && npm ci && npm run validate`
- `cd backend && npm run validate`
- `cd frontend && npm run typecheck && npm run lint && npm test && npm run build`
- `docker compose -f docker-compose.prod.yml config --quiet` with non-secret
  Mongo/Auth/SMTP placeholders
- `docker compose -f docker-compose.prod.yml build` with the same placeholders
- `git diff --check`

Playwright and a manual SMTP smoke test were skipped. The repository has no
runtime switch that injects a fake mail service into a deployed container, and
real SMTP/customer delivery is forbidden for automated validation. Existing
unit/route tests instead inject a recording or failing fake `MailService` and do
not open a network connection. No commits or pushes are part of this task.
