# Split Frontend and Backend

## Goal

Complete the migration from the former Next.js monolith to independently built
frontend and backend runtimes with same-origin browser APIs and safe CI/deploy.

## Non-goals

- Publishing the backend port to browsers.
- Enabling production CORS or a credentialed wildcard.
- Using production data for tests, imports, migrations or E2E.
- Replacing the existing public `/api/**` URLs.

## Current state

- `frontend/` is a UI-only Next.js runtime with same-origin backend rewrites.
- `backend/` is the Fastify API runtime and sole owner of MongoDB/auth/domain code.
- Both production Dockerfiles use the repository root build context.
- Compose runs frontend plus internal backend; production supplies external MongoDB.
- Jenkins validates and builds both images, deploys master and checks both services.

## Constraints

- Preserve public URLs and compatibility response fields.
- Keep frontend free of server secrets, MongoDB models and API implementations.
- Never use a production database for validation.
- Complete, validate, commit and push one phase at a time.

## Decisions

- Use Fastify on Node.js 22 behind Next same-origin rewrites.
- Keep MongoDB as mutable runtime authority and baseline catalog import explicit.
- Build and deploy coordinated frontend/backend tags.
- Use the test Compose overlay with MongoDB tmpfs for startup and E2E validation.

## Open questions

- No architecture questions remain for the split. Final review and operational
  pipeline observation remain before archiving this plan.

## Phase status table

| Phase | Status |
|---|---|
| Phase 0 — Repository audit | DONE |
| Phase 1 — Repository layout and consistency | DONE |
| Phase 2 — Backend extraction design | DONE |
| Phase 3 — Minimal backend runtime | DONE |
| Phase 4 — Shared boundaries | DONE |
| Phase 5 — API migration by route group | DONE |
| Phase 6 — Authentication, cookie, CORS, and CSRF | DONE |
| Phase 7 — Two real production Dockerfiles | DONE |
| Phase 8 — Two-service Docker Compose | DONE |
| Phase 9 — Frontend/backend Jenkins pipeline | DONE |
| Phase 10 — Safe test database and E2E | DONE |
| Phase 11 — Documentation and cleanup | DONE |
| Phase 12 — Final review | DONE |

## Current phase

Complete. The plan was archived after the final code, pipeline, security,
artifact, container, and validation review passed.

## Acceptance criteria

- [x] The application lives under `frontend/`.
- [x] `frontend/app/api/**` contains no API implementation.
- [x] Backend owns all API, auth, MongoDB and domain behavior.
- [x] Both runtimes have real non-root production Dockerfiles.
- [x] Compose runs frontend and internal backend with coordinated tags.
- [x] Jenkins validates/builds/deploys and cleans both runtimes.
- [x] Root README Docker commands match the layout and runtime boundaries.
- [x] Documentation paths are valid.
- [x] Environment-variable documentation matches runtime and CI behavior.
- [x] Relevant validations pass or have explicitly documented blockers.

## Validation matrix

| Validation | Result |
|---|---|
| Preflight branch/status/upstream/log/diffs/file inventory | PASS — expected branch and commit; clean tree; upstream synchronized before review |
| Full phase/code ownership audit | PASS — no frontend API routes, Mongoose/database access, or obsolete server auth/domain cores; backend owns API/auth/MongoDB/domain behavior |
| Jenkins pipeline audit | PASS — strong clean checkout, Jenkins UID/GID backend validation, root artifact cleanup, both validations/images with one tag, Compose build, master-only deploy, three health checks, both temporary-image cleanups, no secret values logged |
| Secret/artifact/generated-file and stale-path scans | PASS — no credential patterns or tracked generated artifacts; local validation artifacts removed; links updated for archive move |
| `git diff --check` | PASS |
| Shared `npm test` | PASS — 1/1 |
| Backend `npm run validate` | PASS — typecheck, lint, 16/16 tests, build |
| Frontend `npm run validate:catalog` | PASS — 27 products |
| Frontend `npm run typecheck` and `npm run lint` | PASS |
| Frontend unit and integration tests | PASS — 37/37 unit; 6/6 integration |
| Frontend `npm run build` | PASS — existing Next.js middleware deprecation warning only |
| Full Playwright UI suite | PASS — 5 applicable tests; 7 intentional fixture/project skips |
| Real split-runtime E2E | PASS — 1/1 against isolated MongoDB 8 tmpfs through frontend proxy |
| `docker compose config --quiet` | PASS |
| Production Docker image build | PASS — `card-credit:final-review` and `card-credit-backend:final-review` |
| Isolated Compose startup and probes | PASS — frontend `/login`, backend `/health` and `/ready`, unauthenticated API proxy 401 |
| Isolated Compose teardown | PASS — containers, tmpfs-backed MongoDB, and network removed |

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
- 2026-07-11: Fixed Jenkins clean-checkout ownership failure. Backend validation
  now runs with the Jenkins host UID/GID instead of root, preventing root-owned
  `backend/node_modules` and `backend/dist`. Post cleanup now removes frontend,
  backend, and shared generated/dependency directories. Existing poisoned
  workspace must be deleted once; subsequent builds are ownership-safe.
- 2026-07-11: Completed Phase 9 pipeline coordination. Jenkins now tracks both
  fully-qualified image names, validates/builds both runtimes, deploys the
  two-service Compose stack only on master, checks frontend HTTP plus backend
  liveness/readiness without logging secrets, and removes both temporary branch
  images. Workspace ownership and post-cleanup cover all three packages.
- 2026-07-11: Phase 5 user/admin group moved profile, admin user management and
  audit-log queries to Fastify, extended the injected auth repository, added
  same-origin rewrites and removed four Next route adapters.
- 2026-07-11: Jenkins success was confirmed by the operator. Phase 5 cards group
  moved card collection/detail and exact-duplicate merge routes to Fastify with
  backend-owned Mongo models, workspace authorization and compatibility output.
- 2026-07-11: Phase 5 completed by moving transactions, cashback, statements,
  payment lifecycle and report summary to Fastify. Backend now owns all Mongo
  domain models and `frontend/app/api` contains no route implementations. Public
  URLs remain same-origin through Next rewrites. Backend validation passed with
  15 tests; frontend and two-image Compose validation are recorded below.
- 2026-07-11: Phase 6 completed the browser security boundary. Production keeps
  CORS disabled, mutation requests reject mismatched Origin and cross-site Fetch
  Metadata, and proxy-aware host/protocol validation preserves the same-origin
  frontend topology. Secure HttpOnly SameSite=Lax host-only cookies remain owned
  by the backend. Backend validation passed with 16 tests and both production
  images built through Compose with `phase6-check`.
- 2026-07-11: Phase 8 completed real Compose startup against an isolated MongoDB
  8 container backed by tmpfs. The first run exposed build-time rewrites targeting
  frontend localhost; production now defaults to Compose DNS `backend:3001`.
  The rebuilt stack passed frontend `/login`, backend `/health` and `/ready`,
  same-origin proxy authentication reached the backend (401 credentials response),
  cross-origin mutation was blocked (403), and teardown removed the test stack.
- 2026-07-11: Phase 10 added a real split-runtime Playwright scenario configurable
  for an externally managed Compose server. It registers through the frontend,
  verifies the secure session and exercises cards, transactions and reports on
  the backend using only the tmpfs Mongo test database. The real scenario passed
  1/1; the refreshed UI suite passed 5 applicable tests with 7 intentional
  project/fixture skips. The isolated database was dropped, the stack removed,
  and both `phase10-check` production images built successfully.
- 2026-07-11: Phase 11 removed obsolete frontend API route cores, Mongoose models,
  auth/database services, database scripts and their superseded monolith tests.
  Frontend no longer depends on Mongoose and retains only UI/browser/catalog
  helpers. Root/backend/architecture documentation now describes the implemented
  split topology. Shared tests passed 1/1, backend validation passed 16/16,
  frontend passed 37 unit + 6 integration + 5 applicable Playwright tests,
  production build passed, and both `phase11-check` images built via Compose.
- 2026-07-11: Phase 12 audited every phase against current code and corrected two
  final boundary gaps: Jenkins now deletes the workspace before checkout, and
  production Compose no longer injects database/auth secrets into the frontend.
  Jenkins checks auth configuration in the backend container. All final package,
  Playwright, split-runtime, Compose, image, health, proxy, security/artifact and
  Git validations passed using only MongoDB 8 on tmpfs. The isolated stack was
  removed and this completed plan was archived.

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

DONE — all phases through Phase 12 passed review. Frontend and backend are real
independent runtimes with tested boundaries, coordinated production images,
two-service Compose, safe CI/deployment, migrated routes, current documentation,
no frontend server secrets, and no obsolete monolith or placeholder artifacts.
