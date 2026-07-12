# Private Payment-Due Calendar Subscriptions

## Goal

Allow an authenticated user to create a private, revocable, read-only iCalendar
subscription URL that calendar clients can poll for current persisted payment
due dates.

## Decisions

- A subscription is bound to the creating session's `userId` and `workspaceId`.
- The raw 256-bit token is returned once; MongoDB stores only its SHA-256 hash.
- Public feed requests authenticate solely by the unguessable token and never by
  browser session, query recipient, card owner label, or email.
- The feed includes unpaid persisted `CardStatement` records only when their
  `CreditCard.userId` matches the subscription user in the same workspace.
- Each payment event runs from 00:00 three days before its due date through
  17:00 on the due date in the card timezone (default `Asia/Ho_Chi_Minh`). It
  includes display alarms at the start, 09:00, and 15:00 on the due date. No
  statement-close events, arbitrary appointments, email addresses, or
  credentials are exposed.
- Users may label, list, create, and revoke only their own subscriptions.
- Frontend constructs the absolute URL from the trusted current browser origin;
  backend returns only a relative path.

## API

- `GET /api/calendar-subscriptions`: list safe metadata for the current user.
- `POST /api/calendar-subscriptions`: create with optional `deviceLabel`, return
  safe metadata and the raw relative subscription path once.
- `DELETE /api/calendar-subscriptions/:id`: revoke an owned subscription.
- `GET /api/calendar-subscriptions/feed/:token.ics`: public read-only calendar
  feed. Invalid, revoked, cross-workspace, or unusable-account tokens return 404.

## Security

Token values and hashes are never logged. List responses never return a token,
hash, or reusable path. Feed responses disable storage caching, set the calendar
content type, and do not reveal whether a token once existed. Account and card
ownership are revalidated on every feed request.

Inactive cards are not filtered from the feed because a persisted unpaid
statement remains a financial obligation after a card is no longer used.

## Implementation status

Implemented on `ai-task/email-statement-calendar` from clean commit `d2ad3ac`.

Files changed:

- Added the `CalendarSubscription` model, token/hash/feed core, authenticated
  lifecycle routes, public token feed route, and server registration.
- Added the frontend API client and responsive Profile settings UI for optional
  device labels, one-time URL display, copy/open, safe metadata listing, and
  revocation.
- Added the Next same-origin rewrite and updated README, architecture, and docs
  navigation.
- Added focused backend tests for token entropy/format/hash, label validation,
  payment-due-only serialization, session enforcement, and opaque malformed
  token responses.

Validation results:

- `cd shared && npm run validate`: passed (1 test).
- `cd backend && npm run validate`: passed (36 tests), including typecheck,
  lint, tests, and build.
- `cd frontend && npm run typecheck && npm run lint && npm test && npm run build`:
  passed (47 tests). Typecheck/lint/build also passed after adding the final
  rewrite.
- Production Compose `config --quiet` with non-production Mongo/Auth/SMTP
  placeholders: passed.
- `git diff --check`: passed.

Skipped checks: no real SMTP was involved; no production MongoDB was used;
Playwright and a deployed Apple Calendar polling test were not run. A focused
Mongo-backed lifecycle test remains useful future hardening.

Risks: the subscription URL is a bearer credential and any holder can read its
financial calendar content until revocation. Application logging is disabled on
the backend feed route, but operators must also avoid URL logging at external
reverse proxies. Calendar refresh frequency is controlled by the client. The
implementation is complete. The confirmed alarm follow-up is committed and
pushed by explicit user request after validation.

Follow-up completed: payment events now span the confirmed three-day safety
window and include three RFC 5545 display alarms. Calendar clients control
whether subscription-provided alarms are honored, so users must also allow
Calendar notifications on their device.

Follow-up validation: shared validation passed; backend typecheck, lint, 36
tests, and build passed; frontend typecheck, lint, 47 tests, and production build
passed. Compose config and final Git checks are recorded before push.
