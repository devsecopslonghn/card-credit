# Implementation plan — Card Credit to production

## 1. Planning assumptions

Repository hiện đã có phần lớn baseline: Next.js frontend, Fastify backend,
Mongo/Mongoose models, auth cookie, card/transaction/statement/report flows,
calendar/reminder, catalog, tests, Docker và Jenkins/GitOps integration. Vì vậy
lộ trình dưới đây không giả định rewrite; mỗi milestone kiểm chứng và harden
phần hiện có trước khi mở rộng.

Không commit, push, deploy hoặc apply infrastructure trong giai đoạn planning.

## Milestone 0 — Baseline audit and contract freeze

**Goal**: thống nhất product scope, current behavior và target contracts trước
khi chỉnh code.

**Tasks**:

- Review existing routes/models/tests/docs against 7 planning documents.
- Mark current/target behavior and identify contract inconsistencies.
- Freeze canonical terms: Provider, Card Product, User Card, Statement,
  Transaction, monthly bank cashback, paid card fee.
- Record ADRs for same-origin Fastify split, snapshot policy and legacy compatibility.

**Files affected**: `docs/product.md`, `docs/requirements.md`,
`docs/architecture.md`, `docs/database.md`, `docs/api.md`, `docs/ui-design.md`,
`docs/architecture/*`, `docs/decisions/*`.

**Dependencies**: repository access, existing tests.

**Acceptance criteria**:

- Scope and out-of-scope are approved.
- API/model inventory has no undocumented private route.
- All conflicting assumptions are listed as questions or risks.

## Milestone 1 — Runtime and security hardening

**Goal**: establish production-safe identity, browser boundary and operational
baseline.

**Tasks**:

- Validate cookie attributes, session expiry/rotation and logout behavior through
  browser integration.
- Enforce same-origin mutation checks and consistent error redaction.
- Add/verify rate limits for login/reset/bootstrap/feed as deployment permits.
- Add audit coverage for security-sensitive admin and auth events.
- Confirm secret injection only at backend runtime and non-root images.

**Files affected**: `backend/src/auth.ts`, `backend/src/auth-routes.ts`,
`backend/src/browser-security.ts`, `backend/src/errors.ts`, `backend/src/config.ts`,
`frontend/middleware.ts`, auth/security tests, Docker/Jenkins docs.

**Dependencies**: Milestone 0; chosen session expiry/rate-limit policy.

**Acceptance criteria**:

- Cross-workspace and role escalation tests fail closed.
- Cookie/token/password/secret redaction verified in logs.
- Browser login/logout/reset E2E passes behind frontend rewrite.
- No security bypass or wildcard credential CORS.

## Milestone 2 — Core card/catalog and data integrity

**Goal**: make card lifecycle and catalog snapshot reliable for real users.

**Tasks**:

- Validate catalog baseline and explicit import dry-run/apply/rollback procedure.
- Harden catalog write validation, audit and image-cache failure behavior.
- Finalize User Card create/update allowlist and immutable snapshot fields.
- Verify duplicate detection/merge preview and legacy-card compatibility.
- Add Mongo index verification and startup/readiness behavior tests.

**Files affected**: `backend/src/catalog*.ts`, `backend/src/card-routes.ts`,
`backend/src/models/credit-card.ts`, `backend/src/models/card-product*.ts`,
catalog/card components, import scripts, database docs/tests.

**Dependencies**: Milestone 1, approved catalog baseline and Mongo backup runbook.

**Acceptance criteria**:

- Inactive product cannot create new card; existing snapshot remains visible.
- Catalog edit never silently changes historical card metadata.
- Duplicate merge is exact-match, explicit and auditable.
- Import dry-run is idempotent and production guarded.

## Milestone 3 — Transaction, statement and payment correctness

**Goal**: deliver trustworthy debt and statement accounting.

**Tasks**:

- Consolidate pure statement/date/summary/cashback-cap domain functions.
- Verify boundary dates, month-end clamp, concurrent statement creation and
  paid-state locking.
- Add transaction validation for amount/rate/currency and server-side ownership.
- Verify dashboard debt projection uses persisted statement summary, not legacy
  monthly fields.
- Add reconciliation fixture tests for formulas and reopen behavior.

**Files affected**: `backend/src/statement-domain.ts`, `backend/src/transaction-routes.ts`,
`backend/src/models/card-statement.ts`, `backend/src/models/card-transaction.ts`,
`frontend/lib/cards/*`, card/statement components and tests.

**Dependencies**: Milestone 2; final business-rule sign-off.

**Acceptance criteria**:

- Formula and state-machine tests pass for normal, month-end, overdue and paid cases.
- No transaction mutation succeeds for a paid statement.
- Workspace/resource checks cover card, statement and transaction parent chains.
- Dashboard and detail totals match server response.

## Milestone 4 — Cashback, fees, reports and reminders

**Goal**: make actual benefit and payment-prevention workflows production-ready.

**Tasks**:

- Verify monthly cashback upsert/status rules and card fee actual-only policy.
- Optimize report filters/indexes and ensure no cashback double counting.
- Harden reminder scheduler claim/retry/timeout/skip behavior for multi-replica.
- Validate SMTP TLS/configuration, recipient authority and safe email content.
- Add observability metrics/log events for report latency and reminder delivery.

**Files affected**: `backend/src/monthly-card-cashback-routes.ts`,
`backend/src/card-fee-payment-routes.ts`, `backend/src/report-routes.ts`,
`backend/src/reminder-*`, `backend/src/payment-reminder.ts`, related models/UI/tests.

**Dependencies**: Milestone 3, approved SMTP test account, representative report data.

**Acceptance criteria**:

- Actual net benefit equals bank cashback actual minus service fee minus paid fees.
- Transaction cashback is visible for reconciliation but never added twice.
- Same reminder key cannot produce duplicate sends; failed sends retry safely.
- SMTP smoke test sends only to approved test recipient and secrets stay redacted.

## Milestone 5 — Calendar, UX/accessibility and API consistency

**Goal**: finish user-facing flows and make the contract predictable.

**Tasks**:

- Verify one-time `.ics` email and private subscription token lifecycle.
- Add/finish modal focus management, keyboard navigation, labels and responsive
  states across dashboard/card/report/admin pages.
- Normalize new endpoints to `data/meta/error` envelope while preserving current
  compatibility fields until versioned migration.
- Add loading/empty/error/retry states and stale-data refresh after mutation.

**Files affected**: `frontend/app/**`, `frontend/components/**`, `frontend/lib/api/**`,
`backend/src/calendar-*`, `shared/src/**`, Playwright/accessibility tests and docs.

**Dependencies**: Milestones 2–4; UX copy and accessibility review.

**Acceptance criteria**:

- Keyboard/mobile smoke journeys pass for login, add card, statement pay, report
  filter and calendar revoke.
- Raw calendar token is displayed only once and never returned by list API.
- API errors render actionable Vietnamese field messages.

## Milestone 6 — Production validation and deployment

**Goal**: ship reproducibly with rollback and recovery evidence.

**Tasks**:

- Run shared/backend/frontend validation, unit/integration/E2E and image builds.
- Run Sonar, Trivy, CodeQL, dependency audit and container lint policies.
- Validate Kubernetes values/secrets/readiness/replicas through dry-run or staging.
- Execute Mongo backup/restore drill and catalog import dry-run in non-production.
- Define alert thresholds for health/readiness, 5xx, latency, SMTP failure and
  reminder backlog.
- Produce release checklist, rollback commands and post-deploy smoke tests.

**Files affected**: `Jenkinsfile`, Dockerfiles, compose/test files, GitOps values
outside this repository if applicable, `README.md`, runbooks and release docs.

**Dependencies**: all prior milestones, staging environment, operator approval.

**Acceptance criteria**:

- Immutable frontend/backend images built from the same Git SHA.
- Staging smoke test succeeds through public frontend origin.
- `/health` and `/ready` semantics verified; backend not publicly exposed.
- Rollback to previous image tag and Mongo restore procedure documented/tested.
- Explicit production approval exists before any deploy/apply action.

## 3. Cross-milestone verification

Mỗi milestone phải chạy phạm vi hẹp trước rồi mới full suite:

```text
shared:   npm ci && npm test
backend:  npm run typecheck && npm run lint && npm test
frontend: npm run typecheck && npm run lint && npm test
critical: npm run build && targeted Playwright E2E
release:  docker build + image scan + staging smoke
```

Không dùng production MongoDB cho test/seed/import/migration. Không trigger hoặc
rerun CI/CD, deploy hoặc approve pipeline khi chưa có yêu cầu rõ ràng.

## 4. Definition of done

- Functional requirements đã được trace tới code/test/API.
- Security, workspace isolation, accessibility và error handling có evidence.
- Database indexes/migrations có review và rollback path.
- Docs cập nhật cùng implementation; no known high-severity issue mở.
- Production deployment có backup, monitoring, smoke test và rollback owner.

