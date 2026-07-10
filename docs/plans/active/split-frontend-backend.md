# Split Frontend and Backend

## Goal

Move from the current Next.js monolith toward separate `frontend/` and
`backend/` runtimes through reviewable phases. Phase 1 only establishes a
consistent repository layout while the UI and API continue to run together.

## Non-goals

- Implementing or scaffolding a standalone backend runtime.
- Moving API routes out of `frontend/app/api/**`.
- Changing business behavior, routes, API contracts, or database schemas.
- Adding a backend image, Compose service, or pipeline.

## Current state

- The Next.js application is under `frontend/` and includes both UI and API routes.
- `frontend/Dockerfile` is the single production Dockerfile and uses the repository
  root as its build context.
- `backend/` contains documentation only; no package, entrypoint, or image exists.
- Compose and Jenkins operate one Next.js application runtime.

## Constraints

- Preserve behavior and public URLs.
- Never duplicate API implementations into `backend/`.
- Never use a production database for validation.
- Do not commit, push, or proceed to another phase without permission.

## Decisions

- Keep `frontend/Dockerfile`; the obsolete root Dockerfile is already absent.
- Delete the nonfunctional `backend/Dockerfile` and create a real one only with a
  real backend runtime.
- Keep a single Compose service with required `MONGODB_URI` and `AUTH_SECRET`.
- Treat auth bootstrap/reset variables as optional, explicit operational inputs.
- Keep the container smoke-test stage disabled until a safe isolated database or
  fully mocked runtime path is verified.

## Open questions

- Backend framework, package boundaries, and ownership of shared contracts.
- API base URL, proxy topology, authentication/cookie boundary, CORS, and CSRF.
- Safe isolated database strategy for container smoke tests and E2E.

## Phase status table

| Phase | Status |
|---|---|
| Phase 0 — Repository audit | DONE |
| Phase 1 — Repository layout and consistency | DONE |
| Phase 2 — Backend extraction design | DONE |
| Phase 3 — Minimal backend runtime | DONE |
| Phase 4 — Shared boundaries | DONE |
| Phase 5 — API migration by route group | IN_PROGRESS |
| Phase 6 — Authentication, cookie, CORS, and CSRF | TODO |
| Phase 7 — Two real production Dockerfiles | DONE |
| Phase 8 — Two-service Docker Compose | IN_PROGRESS |
| Phase 9 — Frontend/backend Jenkins pipeline | TODO |
| Phase 10 — Safe test database and E2E | TODO |
| Phase 11 — Documentation and cleanup | TODO |
| Phase 12 — Final review | TODO |

## Current phase

Phase 5 — API migration by route group.

## Acceptance criteria

- [x] The application lives under `frontend/`.
- [x] API routes remain under `frontend/app/api/**`.
- [x] No API implementation is duplicated under `backend/`.
- [x] `backend/` does not pretend to be a working runtime.
- [x] The current production Dockerfile is `frontend/Dockerfile`.
- [x] Compose references `frontend/Dockerfile` and runs one service.
- [x] Jenkins uses `/workspace/frontend` and validates the Phase 1 layout.
- [x] Root README Docker commands match the layout and runtime boundaries.
- [x] Documentation paths are valid.
- [x] Environment-variable documentation matches runtime and CI behavior.
- [x] Relevant validations pass or have explicitly documented blockers.

## Validation matrix

| Validation | Result |
|---|---|
| Preflight branch/status/log/diffs/file inventory | PASS — expected branch; preserved existing documentation changes |
| Stale documentation path search | PASS — no matches in current files |
| `git diff --check` | PASS |
| `npm ci` | PASS — 385 packages installed; npm reported 3 moderate vulnerabilities |
| `npm run validate:catalog` | PASS — 27 products |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS — 103/103 |
| `npm run test:integration` | PASS — 18/18 |
| `npm run build` | PASS — existing Next.js middleware deprecation warning |
| Production Docker image build | PASS — `card-credit:phase1-layout-test` |
| Compose config without `AUTH_USERS_JSON` | PASS |
| Playwright E2E | SKIPPED — safety must be confirmed before execution |

## Progress log

- 2026-07-11: Audited the local branch and working tree. Found existing changes
  to `AGENTS.md`, `docs/README.md`, and a staged roadmap move; preserved them.
- 2026-07-11: Removed the fake backend Dockerfile, normalized optional auth
  bootstrap variables, added Jenkins layout checks, and corrected README/docs.
- 2026-07-11: Phase 2 inventoried all 32 API route files and selected a Node 22
  TypeScript Fastify backend behind same-origin Next.js rewrites. Added the
  runtime, security, migration, rollback, dependency, and shared-boundary design
  plus ADR 0001. Files: `docs/architecture/backend-extraction-design.md`,
  `docs/decisions/0001-fastify-same-origin-backend.md`, and documentation indexes.
  Validation: route inventory count (32), stale-path review, `git diff --check`,
  and full diff review passed. No runtime code changed. Remaining risk: cookie
  forwarding and catalog-write persistence require implementation validation.
- 2026-07-11: Phase 3 added a real Node 22/TypeScript/Fastify backend package,
  validated environment configuration, redacted structured logging, standardized
  errors, `/health`, database-aware `/ready`, asynchronous Mongoose lifecycle,
  and bounded graceful shutdown. Files: `backend/package*.json`, TypeScript and
  ESLint config, `backend/src/**`, `backend/tests/**`, README, and ignore rules.
  `npm run validate` passed typecheck, lint, 3 unit tests, and build. No business
  API or Dockerfile was added. Remaining risk: a real MongoDB lifecycle test is
  deferred to the isolated test-database phase.
- 2026-07-11: Phase 4 added `@card-credit/contracts`, a pure framework-free
  package containing the shared API error DTO/envelope, and wired both runtimes
  to consume it. Database models, environment, authentication, and validation
  remain server-only. Shared build/test, backend validation, frontend typecheck,
  and 103 frontend unit tests passed. Files: `shared/**`, both package manifests
  and locks, both error adapters, ignore rules, and this plan. Remaining risk:
  additional DTOs should move only alongside actual migrated consumers.
- 2026-07-11: Phase 5 public/catalog group moved the three read-only catalog
  endpoints to Fastify, added contract tests and a same-origin Next.js rewrite,
  and removed the three Next route implementations. Backend validation (4 tests)
  and frontend typecheck, lint, 18 integration tests, and build passed after
  clearing stale ignored `.next` route metadata. Files: backend catalog/config/
  routes/tests, `frontend/next.config.ts`, removed catalog route adapters, and
  this plan. Remaining Phase 5 groups: authentication, domain, and admin/reset.
- 2026-07-11: Approved MongoDB as the mutable Card Catalog runtime authority.
  Added a backend-owned CardProduct model, injected repository boundary,
  MongoDB and in-memory repositories, public/admin Fastify routes, compatible
  HMAC admin authorization and response aliases, and removed the filesystem
  admin writers. Added an explicit baseline importer that is dry-run by default,
  idempotent, validates before writes, and requires a high-friction production
  override. Backend validation passed with 8 tests. No MongoDB connection was
  made; isolated database integration remains deferred. Remaining Phase 5
  groups: authentication, domain (including moving catalog-backed User Card
  creation fully behind the repository), and remaining admin/reset routes.
- 2026-07-11: Reviewed and completed the uncommitted catalog-authority work after
  resumption. Restored the public response contract (no legacy aliases), added
  persistent audit events to the existing `authauditlogs` collection without a
  duplicate model, and brought the importer under lint/typecheck. Backend
  validation passed (typecheck, lint, 8 tests, build); shared validation passed;
  frontend catalog validation, typecheck, lint, 99 unit tests, 18 integration
  tests, and build passed. No MongoDB connection/import was executed.
- 2026-07-11: Phase 5 authentication group moved login, logout, session lookup,
  registration, forgot/reset password, and guarded bootstrap routes to Fastify
  behind the same-origin rewrite. Added repository-injected Mongo authentication,
  compatible scrypt hashes, signed secure cookies, hashed one-use reset tokens,
  forwarded-origin reset links, optional bootstrap inputs, and audit events.
  Removed all seven Next auth route adapters. Backend validation passed with 10
  tests; frontend typecheck, lint, 99 unit tests, 18 integration tests, and build
  passed. Old transport cores remain temporarily because remaining Next domain/
  admin tests import the shared session helpers; remove after those route groups.
- 2026-07-11: Phase 5 domain migration began with `/api/notes`. Added injected
  Mongo/in-memory repositories, workspace-scoped Fastify routes and contract
  tests, added the same-origin rewrite, and removed the Next route adapter.
- 2026-07-11: Phase 5 master-data group moved banks and card types to Fastify,
  preserving authenticated reads, admin-only writes, duplicate checks and legacy
  response messages. Added injected repositories/tests and removed four Next
  route adapters.
- 2026-07-11: Per explicit CI priority, introduced the real backend production
  Dockerfile early, fixed the compiled backend start path, made both Dockerfiles
  install the shared package, and extended Jenkins layout validation, backend
  validation, and backend image build. Compose remains single-service until its
  scheduled phase; this is not a placeholder runtime or fake image.
- 2026-07-11: Docker/pipeline prerequisite validation completed. Fixed shared
  package availability in every Docker build stage, built
  `card-credit-frontend:pipeline-check` and `card-credit-backend:pipeline-check`
  successfully from repository root, and confirmed both images run non-root
  production artifacts. Jenkins now validates backend independently and builds
  both images. Phase 7 is DONE early by explicit user priority; two-service
  deployment and coordinated cleanup remain Phase 8/9 work.
- 2026-07-11: Phase 8 started early for pipeline readiness. Compose now defines
  public frontend and internal backend services, coordinated image tags,
  backend health dependency, required secrets via environment, and no published
  backend port. Static config validation is required before commit; safe startup
  remains deferred to the isolated MongoDB phase.

## Known issues

- Phase 5 catalog storage blocker is resolved: MongoDB is the mutable runtime
  authority and `frontend/data/card-presets.json` is a read-only explicit import
  baseline. A safe isolated MongoDB instance is still required before claiming
  model/index/import integration validation.
- `npm ci` reports 3 moderate dependency vulnerabilities; dependency upgrades are
  outside this layout-only phase.
- Next.js reports that the `middleware` convention is deprecated; changing it is
  outside this layout-only phase.
- Docker image preparation fell back to placeholders for unavailable UOB image
  downloads as designed; the image build passed.
- Historical archived plans may describe old paths as historical state; active
  documentation must not rely on those paths.

## Final Definition of Done

All phases through Phase 12 are DONE; frontend and backend are real independent
runtimes with tested boundaries, two production images, two Compose services,
safe CI/deployment, migrated routes, current documentation, and no obsolete
monolith or placeholder artifacts.
