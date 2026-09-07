# Repository assessment

## Final Discovery Summary

**APPLICATION — CONFIRMED:** Workspace-scoped personal finance application, originally credit-card management; now accounts, spending, receivables, statements, budgets, cashback and reporting, with a fixed-identity MCP connector.

**STACK — CONFIRMED:** Next.js 16/React 19; Fastify 5/TypeScript; Mongoose/MongoDB; shared JavaScript/Zod contracts; Node 22 containers; GHCR; external Helm/Argo CD deployment.

**CURRENT DELIVERY FLOW — CONFIRMED:** Push → GitHub Actions quality → two SHA-tagged images → GitOps values commit → Argo CD sync/index hook → Kubernetes frontend/backend. No application CI stage waits for runtime/business verification.

**CURRENT AGENT FLOW — CONFIRMED/PARTIAL EVIDENCE:** Written role instructions → repository tools and local regression tests → human-controlled financial confirmation and delivery boundaries. This investigation verified repository reads, test execution and limited runtime reads; it did not exercise writes, MCP credentials or delivery permissions.

**CURRENT MATURITY — CONFIRMED:** Level 2 established; Level 4-style infrastructure observations demonstrated in this session, but Level 3 sandbox mutation and reliable end-to-end runtime verification are not established. Do not interpret individual capabilities as scoped autonomous delivery.

**STRONGEST EXISTING CAPABILITIES**
1. Shared contracts and services across REST/MCP, with parity and boundary tests.
2. Command idempotency, preview consumption, transactions and success auditing.
3. SHA-linked images, Argo CD, probes and accessible deployment status.

**BIGGEST GAPS**
1. No automated authenticated financial verification after reconciliation.
2. Real MongoDB transaction/index behavior is not exercised by current CI.
3. Instructions and documentation diverge from current code and delivery configuration.

**MOST IMPORTANT FINDING:** Both workloads currently run the assessed commit and report ready, but this establishes infrastructure health, not monetary correctness. The documented public `/ready` request actually returns 404; the existing smoke script cannot authenticate its protected reads.

**UNKNOWNS THAT AFFECT ARCHITECTURE:** Production classification and data ownership; effective write permissions; database topology/index state/backups; deployed MCP identity and actual old-writer fencing; usable financial telemetry and alert ownership.

## Scope, confidence and evidence baseline

Assessment date: 2026-09-05. Application checkout `/home/longhn0710/workspace/card-credit`, origin `git@github.com:devsecopslonghn/card-credit.git`, clean before assessment, HEAD `4f26a8a97fcc8cf390b17f52748fb3dc22063e1c`. `git ls-remote origin HEAD` returned the same SHA. The GitHub web cache showed older Jenkins/Compose content; current Git files take precedence.

External evidence is explicitly prefixed **GitOps:** and means sibling repository `../k8s-namepsace-chart`, clean at `337a21ae8cce14b33e3faf49f1a9c7f8c1061892`. Its chart is not application-owned source. Runtime observations below are point-in-time, read-only Kubernetes/HTTP checks. No secrets, financial records, runtime logs or database contents were retrieved. No deployment, repair, login, registration or business mutation was performed.

Confidence labels: **CONFIRMED** = inspected source or executed observation; **LIKELY** = supported inference; **UNCERTAIN** = unresolved; **NOT FOUND** = absent from inspected scope, not proof of global absence. Post-deployment YES/PARTIAL/NO/UNKNOWN describes verification mechanisms separately.

## 1. Product Summary

**CONFIRMED:** README explicitly describes personal finance beyond credit cards and separates personal spending, actual cash movement and credit debt. Vietnamese UI supports individuals maintaining workspace-specific accounts/cards; global administrators manage users/catalog. No evidence of bank payment execution or a bank integration was found. This is financial tracking, not demonstrated payment processing.

Evidence: `README.md`; `frontend/app/accounts/page.tsx`, `cards/page.tsx`, `reports/page.tsx`, `admin/users/page.tsx`; `backend/src/financial-domain.ts`.

### Core Domains

Accounts (DEBIT/CASH/E_WALLET/CREDIT), financial transactions, card statements/payments, reimbursement receivables, monthly bank cashback, card fees, budgets/categories, recurring expenses, notifications, calendar subscriptions and catalog/master data. Evidence: `backend/src/runtime-routes.ts`, `backend/src/models/`, `frontend/app/`.

### Critical User Flows

Register/login → personal workspace → create account/card → record spending → inspect cash/debt/report views → preview and confirm statement payment. Other flows: record reimbursement; monthly cashback and actual fees; budget/recurring planning; reminder email and private calendar feed; administrator user/catalog maintenance. MCP reads and guarded commands invoke application services under one configured identity. Evidence: `README.md`, `backend/src/services/`, `backend/src/mcp/manifest.ts`, `frontend/lib/api/`.

### Financial-Critical Areas

`financial-domain.ts` computes impacts; `services/financial-transaction-service.ts` persists them; `services/statement-payment-command-service.ts` settles statements; `services/account-service.ts` handles balances/merges; `services/financial-report-service.ts` aggregates; `services/command-guard-service.ts` coordinates atomicity. Fee/cashback command services affect reported benefit. Linked SRS, source-of-truth and rollout documents under `docs/` are **NOT FOUND** in this checkout; README links are not substitute evidence.

## 2. Repository Structure

Paths below are application-relative unless marked GitOps.

| Path | Responsibility | Entrypoint | Depends On | Tests |
| --- | --- | --- | --- | --- |
| `frontend/app`, `components` | Pages and UI | `app/layout.tsx`, page files | React, browser clients | `frontend/tests`, E2E |
| `frontend/lib/api`, `proxy.ts` | HTTP clients, coarse cookie-presence gate | client exports, `proxy` | relative `/api`, shared contracts | client/proxy tests |
| `backend/src` | REST composition, auth, lifecycle | `server.ts`, `runtime-routes.ts` | Fastify, services | route/runtime tests |
| `backend/src/services` | Business operations | service classes | domain, models, contracts | service/invariant tests |
| `backend/src/models` | Persistence and indexes | Mongoose schemas | MongoDB | mocked model/service tests |
| `backend/src/mcp` | Streamable HTTP tools | `http.ts`, `manifest.ts` | SDK, services | transport/parity/preview tests |
| `shared/src` | Runtime schemas and DTO declarations | `index.js`, `index.d.ts` | Zod | `shared/tests` |
| `backend/scripts` | Backup, reconciliation, index/import utilities | package scripts | database, domain | selected helper tests |
| `.github/workflows` | Validation, publication, GitOps update, cleanup | `ci.yml`, `cleanup.yml` | GitHub variables/secrets, external workflow | no pipeline test found |
| `.codex/agents`, `AGENTS.md` | Coding/review agreements | role Markdown | human/session tooling | no permission enforcement |
| **GitOps:** `card-credit` | Helm deployments and hook | `Chart.yaml`, `values.yaml` | ingress, secrets, external DB | no chart smoke suite found |

**CONFIRMED:** Three independent npm packages with lockfiles; frontend/backend use `file:../shared`. No root workspace orchestrator, Nx or Turborepo configuration found. Shared exports source directly rather than a compiled distribution.

## 3. Application Architecture

```text
Browser --HTTPS--> nginx ingress --HTTP--> Next.js :3000
Browser relative /api --Next rewrites/HTTP--> backend service :3001
Fastify REST --> shared schemas + application services --> Mongoose --> MongoDB
MCP client --HTTPS /mcp, bearer token--> Fastify MCP --> same services
Backend reminder scheduler --> SMTP mail service --> recipient/calendar client
```

**CONFIRMED:** Interfaces and configuration: `frontend/next.config.ts` supplies HTTP rewrites using `BACKEND_INTERNAL_URL`; production default is `http://backend:3001`. **GitOps:** `templates/backend.yaml` provides a compatibility Service named `backend` because rewrites are compiled at build time. `templates/ingress.yaml` sends `/mcp` and `/docs` directly to backend; `/` to frontend. No direct ingress route for `/health` or `/ready` exists.

Mongo connection uses `MONGODB_URI` in `backend/src/database.ts`; SMTP uses `mail-service.ts`; `server.ts` starts reminders after database connection/listen. Private calendar feeds are token-based (`calendar-subscription.ts`, associated routes/service). Catalog baseline and external image sources appear in `frontend/data/`, `next.config.ts`; they are not the mutable financial datastore.

## 4. Data & Financial Model

### How is money represented?

**CONFIRMED:** Integer VND in domain validation, stored using JavaScript/Mongoose `Number`, not Decimal128 or a decimal library. `financial-domain.ts` requires positive safe-integer transaction amounts and nonnegative safe-integer offsets. Account currency enum is VND (`models/account.ts`). Percentage fees use floating-point arithmetic and `Math.round`. Schema numeric minimum constraints alone do not establish safe-integer enforcement for every write or aggregate.

### Important financial invariants

**CONFIRMED:** Credit expenses increase debt without immediate debit outflow; statement payment decreases debt/cash without creating another personal expense; reimbursement does not independently reduce card debt; expected reimbursement plus refund cannot exceed charge amount; technical adjustments can avoid operating-spending impact. Evidence: `financial-domain.ts`, `tests/accounting-invariants.test.ts`, `tests/financial-domain.test.ts`, payment service/tests.

Accounts have workspace/name uniqueness and a partial unique card link; statements have workspace/card/date uniqueness; transactions have partial unique statement-payment identity. Voided transactions are excluded by find/aggregate hooks. Evidence: `models/account.ts`, `card-statement.ts`, `financial-transaction.ts`.

**CONFIRMED:** Command guard binds workspace/operation/idempotency key, rejects payload mismatch, consumes preview metadata and writes receipt/result/success audit inside `withTransaction`. Evidence: `services/command-guard-service.ts`; preview/receipt/audit models; command guard tests. Failed transaction persistence does not establish a durable failure-audit record: the inspected guard inserts only SUCCESS inside the transaction.

### Corruption/regression exposure

Persisted derived impacts can diverge from later rule changes; queries must consistently scope workspace and exclude voids; concurrency relies on actual database transactions and installed unique indexes. MongoDB transaction-capable topology is **LIKELY required**, but actual topology/index installation is **UNCERTAIN**. Confirm using authorized database metadata inspection and isolated transaction tests.

**CONFIRMED:** Despite AGENTS prohibiting hard deletion, `FinancialTransactionService.deleteInternal` uses `deleteOne`; it blocks statement payments and reimbursement parents, but still deletes other history. Fee and monthly cashback services also hard-delete records. Evidence: `services/financial-transaction-service.ts:331`, `fee-command-service.ts:53`, `monthly-cashback-command-service.ts:46`. This is an existing policy/implementation mismatch, not a proposed fix.

No general migration runner/version ledger found. Named maintenance scripts and an external index hook exist. README's claim that legacy data was already migrated/deleted is **UNCERTAIN** as a runtime fact.

## 5. Authentication & Authorization

**CONFIRMED:** HMAC-SHA256 signed session cookie `card_credit_session`, HttpOnly/Secure/SameSite=Lax, host-only; default expiry eight hours. Passwords use salted scrypt; reset tokens are SHA256-hashed in storage. Evidence: `auth.ts`, `password.ts`, `services/password-reset-service.ts`.

`context.ts` reloads the current user, checks active/locked/workspace/sessionVersion and derives the current role when a repository is supplied. Production composition passes the auth repository to route groups (`runtime-routes.ts`). Roles are admin/user; `app.ts` enforces admin for catalog operations. Browser security uses Origin/Fetch Metadata (`browser-security.ts`). Frontend proxy only checks cookie presence and is not authoritative authentication.

**CONFIRMED:** Enforcement is shared helper plus per-route/service usage, not universal Mongo row security: workspace filters remain explicit. `browserServiceContext` has a no-repository fallback using signed session claims. Tests cover boundaries, but future callers must choose the correct helper/dependencies.

Registration chooses admin when `countUsers() === 0` before `createUser`; atomic first-admin election is **NOT FOUND** in this service. Concurrent bootstrap behavior needs verification. Reset-link exposure is configurable through `PASSWORD_RESET_RETURN_TOKEN`; production exclusion is not enforced in `loadConfig`.

MCP uses a bearer secret, fixed user/workspace and default read mode; write requires fence acknowledgement plus preview/confirmation. Evidence: `config.ts`, `mcp/context.ts`, `mcp/http.ts`, `mcp/preview.ts`. **GitOps:** values explicitly enable write and acknowledge fencing; actual fencing of every older writer is **UNCERTAIN**.

## 6. Local Development Flow

```text
Fresh clone → Node/npm → npm --prefix shared ci
→ npm --prefix backend ci → npm --prefix frontend ci --include=optional
→ provide isolated MongoDB and AUTH_SECRET (32+ characters)
→ backend npm run dev → frontend npm run dev → /register
```

Backend uses `tsx watch src/server.ts` on 3001; frontend uses `next dev` on 3000 with `BACKEND_INTERNAL_URL=http://127.0.0.1:3001`. Evidence: package manifests, README/config. Node 22 is the CI/container baseline; this shell had Node 20.19.6 and existing dependencies, so the successful tests below are not clean-install/Node-22 validation.

Manual requirements: provision a nonproduction transaction-capable database, ensure indexes, supply auth secret, bootstrap account, optionally import catalog. Catalog import defaults to dry-run; apply needs explicit flag and production override (`backend/scripts/import-card-catalog.ts`). SMTP is optional for basic finance but required for email. MCP needs its identity/token/preview configuration. No Compose, devcontainer or maintained disposable database harness found. README still mentions Compose in one architecture sentence; split-runtime E2E requires a removed Compose stack.

## 7. Testing Discovery

| Test Layer | Framework | Command | Coverage/Purpose | Can Agent Execute? |
| --- | --- | --- | --- | --- |
| Shared contracts | node:test | `npm --prefix shared test` | schemas, ranges, DTOs | Yes; 28 passed |
| Backend regression | node:test + tsx | `npm --prefix backend test` | curated domain/auth/routes/MCP/guards | Yes; 177 passed |
| Backend extended | same | `npm --prefix backend run test:all` | all test files | Tool/deps present; not run |
| Frontend regression | node:test | `npm --prefix frontend test` | curated client/pure-function checks | Yes; 44 passed |
| Frontend extended | node:test | `npm --prefix frontend run test:all` | listed unit + catalog integration | Available; not run |
| API/MCP contracts | Fastify inject, SDK memory transport | backend suites | parity, registered interfaces, access boundaries | Included subsets passed |
| Browser | Playwright | `npm --prefix frontend run test:e2e` | desktop/mobile, mostly intercepted APIs | Config exists; not run |
| Real DB | NOT FOUND | no isolated CI command | actual indexes/transactions/durability | Not established |
| Deploy smoke | Node fetch | `npm --prefix frontend run smoke:deploy` | catalog, cards, summary | Script exists; broken auth assumptions |
| Kubernetes | kubectl/manual | README rollout commands | status/probes | Read access verified |

Executed all three default suites once, no failures/skips, using installed dependencies. Output logs: `/tmp/card-credit-discovery-{shared,backend,frontend}.log` (ephemeral evidence). No coverage percentages were generated. Lint/typecheck/build/full suites/browser were not executed in this discovery session.

**CONFIRMED:** Tests use fakes/mocks and pure assertions; guard tests emulate `withTransaction`, not MongoDB rollback. Financial/auth boundaries do have regression tests. Determinism is **LIKELY** for pure fixtures, not guaranteed: guard concurrency uses short timers; split-runtime registration assumes an empty DB and fixed email, skips without external-server mode. E2E defaults start only frontend.

Tests can be weakened by editing expected results or curated lists. One “net assets” invariant test asserts constant arithmetic rather than calling application reporting. No external immutable oracle found. Untested delivery-critical paths include actual transaction rollback/index contention, authenticated full finance workflow against deployed services, SMTP delivery and browser-to-database statement settlement.

## 8. Build Flow

**CONFIRMED:** CI order: install all packages → shared tests → frontend typecheck/critical tests/build → backend typecheck/lint/critical tests/build.

Commands: each package `npm run typecheck`; backend/frontend `npm run lint`; backend `npm run build` = `tsc -p tsconfig.json`; frontend build = `next build`; shared build = TypeScript checking JavaScript with `--noEmit`. No dedicated formatting command found. Frontend lint and shared typecheck are documented but absent from CI quality steps.

```text
Shared JS/Zod sources → linked runtime dependency
Backend TS → dist/src + dist/scripts + compiled tests → backend image
Frontend source → Next standalone/static/public → frontend image
```

Docker root-context commands: `docker build -f frontend/Dockerfile -t card-credit-frontend:local .` and corresponding backend command. Frontend image preparation also runs `prepare:card-images`. Dockerfiles compile but do not themselves execute the advertised full validation; CI owns those checks. No build result was independently established here.

## 9. CI Discovery

**CONFIRMED:** `.github/workflows/ci.yml` triggers pushes on master/main and pull requests. PRs validate only; push publication requires quality success. Image jobs publish two images; updater checks out configured GitOps repository/branch using `GITOPS_TOKEN`, edits `card-credit/values.yaml`, commits and pushes. Checkout branch is variable but push destination is hardcoded `master`—a configuration-dependent risk. No lint/security/SAST/dependency/container scan stage beyond listed checks found.

`.github/workflows/cleanup.yml` invokes an external organization cleanup workflow weekly and manually; scheduled runs enable deletion. Actual retention logic and rollback-image protection are **UNCERTAIN** because delegated workflow was not inspected.

**EXTERNAL / NOT VISIBLE FROM APPLICATION REPO:** GitHub variable values, token scopes, branch protection, actual Actions execution history and external reusable workflow behavior. Current GitOps/live image evidence is consistent with completed delivery but is not an Actions run log. Jenkinsfile is **NOT FOUND**; `.codex/agents/verification.md` and `repo-architect.md` retain obsolete Jenkins/shared-library references.

## 10. Container & Registry Flow

**CONFIRMED:** Both images use multi-stage Node 22 Alpine and named non-root runtime users. Backend includes compiled scripts/catalog and `/health` Docker HEALTHCHECK. Frontend has no Docker HEALTHCHECK; Kubernetes probes `/login`. Frontend copies standalone output plus the full dependency directory for OpenTelemetry, contrary to README's purely traced-dependency description.

Images publish Git SHA and mutable `latest`; GitOps selects SHA. **GitOps:** GHCR image names and `ghcr-pull` reference are explicit. Nexus strings remain only compatibility replacements/stale external README. No explicit OCI revision label or app version endpoint found; Kubernetes image references and image IDs make deployed revisions observable. Container build/push permissions were not exercised.

## 11. Kubernetes / Deployment Discovery

**CONFIRMED, external:** `card-credit/Chart.yaml`, `values.yaml`, `templates/{namespace,frontend,backend,ingress,data-integrity-migration}.yaml`; `gitops/workloads.yaml` Argo Application, project `drgdevlab`, master branch, destination namespace `card-credit` in the Argo cluster.

One frontend and one backend replica; each requests 100m CPU/256Mi, limits 1 CPU/1Gi. Backend pins `k8s-master`; external README explains MongoDB egress allowlisting (documented reason, not verified networking). Frontend prefers master with worker fallbacks. Runtime Secret via backend `envFrom`; no credential values inspected. Pod contexts use RuntimeDefault seccomp, dropped capabilities and no privilege escalation. No application-specific ServiceAccount/RBAC, NetworkPolicy, HPA or disruption budget found in this chart.

Ingress uses nginx/TLS and redirects HTTPS; certificate provision is external. No chart ConfigMap or DB workload. Observability says `dev`, while Node runs production mode: actual business-production classification is **UNCERTAIN**. No separate staging/prod values found.

Before workloads, an Argo Sync wave -1 Job runs compiled `ensure-data-integrity-indexes.js` with apply enabled; it checks duplicates and creates/verifies named indexes, not every command-guard index. Hook retries/deadline are bounded and successful jobs deleted. No migration was run by this investigation.

Live observations: Argo `card-credit` Synced/Healthy, operation Succeeded, GitOps revision `337a21a…`; automated selfHeal=true, prune=false. Both Deployments desired=ready=1, pods ready with zero restarts, both tagged `4f26a8a…`. Their image IDs resolve to digests. Both `kubectl rollout status` calls succeeded. This confirms current reconciliation, not every historical deploy or business invariant.

## 12. Post-Deployment Verification

Status reflects existing automated/documented mechanisms, with this investigation noted separately.

| Check | Answer | Evidence / limitation |
| --- | --- | --- |
| Rollout status | PARTIAL | README manual command; both passed now; no CI wait |
| Desired replicas | PARTIAL | chart declaration; read directly now |
| Ready replicas | YES | Kubernetes readiness; 1/1 observed each |
| Pod events | NO | no explicit delivery step found; not retrieved here |
| Logs inspected | UNKNOWN | no automatic review found; logs not read |
| Health endpoint | PARTIAL | internal probes; public `/ready` returns 404 |
| Actual API behavior | PARTIAL | manual account/transaction checklist; unauthenticated 401 observed |
| Browser behavior | PARTIAL | Playwright exists outside CI; login HTTP 200 is not browser interaction |
| Image/version | PARTIAL | SHA tags and live digests; no post-publish CI comparison |
| Database behavior | PARTIAL | connect-state readiness and index hook; no business transaction test |
| Regression signal | NO | no postdeploy baseline/SLO gate found |
| Automatic rollback | NO | none found; self-healing is not version rollback |

### What currently proves a deployment is successful?

CI proves configured checks/image publication/GitOps update. Argo and probes separately establish reconciliation and basic readiness. There is **no repository-defined automated proof of end-to-end financial delivery**. It would be inaccurate to claim only `kubectl apply` success: no such direct deploy pipeline exists, and probes/Argo do provide stronger infrastructure evidence.

`frontend/scripts/smoke-test.mjs` allows a redirect for `/cards`, supplies no session cookie for protected requests, and expects summary fields at top level while APIs/tests use `{data: ...}`. It also requires nonempty catalog despite empty catalog being operationally valid. It is not invoked by CI.

`database.ts` readiness reads an internal state set after initial connect, not live connection state on disconnect events. Thus even internal `/ready` is weaker than an ongoing database round-trip. This and the ingress `/ready` 404 are separate limitations.

## 13. Observability Discovery

**CONFIRMED:** Fastify structured logging/redaction and request IDs in `app.ts`; lifecycle events in `server.ts`; JSON logger/sanitization in `frontend/lib/observability/logger.mjs`; correlation IDs in `context.ts`; monetary success audit in command guard.

Both Dockerfiles enable OpenTelemetry auto-instrumentation. **GitOps:** chart exports traces/metrics using OTLP gRPC to `collector.observability-dev.svc.cluster.local:4317`, 10% parent-based sampling, log exporter disabled. This proves configured telemetry, not received spans or useful financial metrics. External `platform-observability/` contains Grafana/resources; live Argo reported its application healthy. Dashboards, alerts, Prometheus queries, trace continuity and retention were not verified. No application error-tracking integration or financial SLO gate found.

## 14. Current Agent/Codex Capabilities

Instructions: root/backend/shared `AGENTS.md` and eleven role Markdown files under `.codex/agents`. No SKILL.md, CLAUDE.md, GEMINI.md or repository MCP client configuration found. Backend MCP server is not evidence that this coding session holds its credentials.

| Capability | Evidence | Confidence |
| --- | --- | --- |
| Read repository | filesystem + remote HEAD read succeeded | CONFIRMED |
| Modify code | writable workspace; prohibited in this session | UNCERTAIN permission beyond report |
| Run tests | three default suites passed | CONFIRMED |
| Build | manifests/compiler/dependencies exist; not executed | UNCERTAIN verified result |
| Commit | git executable; no commit attempted | UNCERTAIN authorization |
| Push | remote read works; no push attempted | UNCERTAIN write access |
| Build image | Docker executable exists; daemon/build not tested | UNCERTAIN |
| Deploy Kubernetes | kubectl exists; coding-task deploy prohibited by AGENTS | UNCERTAIN effective write access |
| Inspect Kubernetes | scoped deployment/pod/application reads succeeded | CONFIRMED |
| Read runtime logs | `auth can-i get pods/log -n card-credit` = yes; logs not fetched | CONFIRMED permission response only |
| Verify API | public login/ready/protected anonymous HTTP checks | CONFIRMED limited access |
| Verify UI | Playwright config exists; no browser execution | UNCERTAIN |
| Modify production | expressly disallowed in discovery/coding agreement | UNCERTAIN technical rights; not authorized |

Tool existence is not verified access. No broad cluster-admin test or secret permission enumeration was performed.

## 15. Existing Agent Workflow / Human Bottlenecks

**LIKELY:** Human assigns capability → agent traces contracts/services/adapters → edits within assigned scope → targeted checks/independent review → human-controlled delivery → Actions/Argo → manual runtime review. Evidence: `.codex/agents/verification.md`, `capability-owner.md`, `AGENTS.md`, README. Actual historical sessions are **UNCERTAIN**.

The `?` is authenticated financial/browser verification and incident ownership after reconciliation. Humans must supply approved nonproduction context, clarify deleted requirements/runbooks, review financial previews, establish fencing, and decide acceptable delivery. Logs need not inherently be human-provided: this session has log-read permission, although no automated diagnostic workflow was found. Human UI checks remain in practice unautomated by CI; actual organizational approval settings are unknown.

## 16. Current Maturity

Current level: **Level 2, conservatively**. Executable local tests/tooling are proven; isolated sandbox mutation is not. Read-only runtime evidence reaches part of Level 4 but does not establish the missing lower-level authorization/environment controls. Levels 5/6 are unsupported.

What prevents next level: no identified authorized disposable environment and tested mutation boundary, plus incomplete real-database/E2E harness. What prevents reliable delivery: no integrated business verification, deployment outcome gate or rollback evidence. Evidence: package scripts, CI, chart, runtime checks and capability table above.

## 17. Gaps

- **Context:** Missing linked docs/SRS; agents must reconstruct finance and writer-cutover decisions (`README.md`, absent `docs/`).
- **Testing:** Curated suites omit extended cases; no real Mongo transaction/index harness; browser suite outside CI (`package.json` files, workflows, tests).
- **Runtime verification:** No authenticated postdeploy finance check; stale smoke and inaccessible public readiness (section 12).
- **Observability:** No verified financial regression metrics/alerts or failure-audit persistence (`command-guard-service.ts`, external OTEL config).
- **Safety:** Hard deletes contradict financial-history agreement; write-mode fence is acknowledged configuration, not demonstrated old-writer isolation; effective deployment privileges unknown.
- **Documentation:** Obsolete Jenkins/Nexus/Compose references, absent runbooks, overstated Docker validation and dependency packaging.
- **Financial correctness:** Model constraints differ from domain safe-integer checks; mocked concurrency cannot prove Mongo atomicity; no verified aggregate overflow boundary or database backup/restore evidence.

## 18. High-Risk Areas

| Rank | Area / relevant paths | Reason | Existing protection | Missing protection/evidence |
| --- | --- | --- | --- | --- |
| CRITICAL | Financial history: transaction/fee/cashback services | Permanent deletion changes audit/report evidence | Workspace checks; payment/child guards; transaction command guard | Consistent history preservation; verified restore |
| HIGH | Command guard/payment/account services, models | Retry/concurrency/index failure can alter money | Idempotency, previews, transactions, unique schema indexes | Real DB rollback/contention tests and deployed index evidence |
| HIGH | Auth registration/context/reset services | Admin bootstrap and reset configuration affect account takeover boundary | Scrypt, signed sessions, user reload, role tests | Verified concurrent first-admin election; production reset-link configuration |
| HIGH | GitOps writer mode/runtime secret/index hook | Active financial writer and automated schema changes | Explicit fence setting, guarded tools, bounded hook | Proof of old-writer fencing; credential scope and recovery evidence |
| HIGH | Workspace-scoped queries/services | A missed filter can cross tenant boundaries | Shared context and boundary tests | Central database scoping; complete runtime isolation proof |
| MEDIUM | CI updater, external cleanup | Branch mismatch/retention can impede delivery or rollback | SHA references, quality gate | Verified external variables/retention and release outcome gate |
| MEDIUM | Readiness/smoke/telemetry | False operational confidence | Argo, probes, HTTP observations | Live DB probe semantics and authenticated business validation |
| LOW | Shared packaging/catalog validation | Established separations with remaining drift | Lockfiles, schema tests, explicit import | Clean-build verification in this session |

Severity ranks potential impact, not a claim of an active incident or exploited vulnerability.

## 19. What Should Not Be Changed

Preserve demonstrated foundations: shared framework-free contracts; backend-owned services used by REST/MCP; integer-VND distinctions between spending/cash/debt; existing Node test/Playwright framework; guarded commands; explicit catalog import; split images with SHA provenance; established external Helm/Argo ownership. Evidence: the corresponding source, passing default tests and live deployment observations above. No replacement framework or architecture is justified by discovery alone.

## 20. Open Questions

1. Is this namespace operationally production despite `deployment.environment=dev`, and who owns its data?
2. Which sandbox and write actions may an agent use? What are its actual GitHub, Kubernetes and MongoDB privileges?
3. Does MongoDB support required transactions, and are every receipt/preview/uniqueness index and backup restore validated?
4. Where are the missing SRS, finance-source-of-truth, writer-cutover and recovery runbooks?
5. Which process proves older writers are fenced while deployed MCP is in write mode?
6. Who reviews authenticated UI/financial correctness after Argo sync, and where is that evidence retained?
7. Are GitHub branch variables consistent with the hardcoded master push, and which branch protections apply?
8. What does the delegated cleanup retain, particularly last-known-good images?
9. Are telemetry signals actually arriving, and which alerts identify wrong balances, failed reminders or missing audit entries?
10. Are hard deletions intentional exceptions or regressions against AGENTS history-preservation requirements?

Discovery ends here. No fixes, architecture documents, deployment changes or autonomy changes were made.
