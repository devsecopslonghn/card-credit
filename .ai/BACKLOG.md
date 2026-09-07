# Verified Delivery backlog

Status: proposed, unassigned. No packet below is executed in this setup. Baseline: discovery sections 7–18. ASTRA owns risk/acceptance; only the compact selected packet and linked sections go to LUNA.

## Ranked gaps

Rank measures impact on reliable verification, not severity of every production risk.

| Rank | Known gap | Decision / dependency |
| --- | --- | --- |
| 1 | No automated authenticated postdeploy financial gate | Umbrella exit requires M1 + M2 evidence; identity/environment prerequisite is unresolved |
| 2 | Broken smoke auth/response assumptions | L01 narrows existing smoke to honest public checks; L03 specifies separate authenticated proof |
| 3 | Real Mongo transaction/index behavior absent from CI | L04 / M3; required before accepting database-sensitive changes |
| 4 | Readiness weaker than DB round-trip | Report weakness in M1; future bounded readiness fix with disconnect/recovery tests, no premature healthy claim |
| 5 | Hard deletion conflicts with history preservation | High safety severity; prohibit smoke delete cleanup now; separate R3 semantics decision before fixing history |
| 6 | Public `/ready` assumption wrong | M1 uses explicit internal route and reports 404; do not add public exposure merely to satisfy a script |
| 7 | Browser E2E outside CI | M2 browser proof using existing Playwright; trusted safe-environment CI integration follows harness readiness |
| 8 | Jenkins/Nexus/Compose documentation drift | Narrow corrections with touched workflow; broader ownership reconciliation later, no resurrection of old stack |

Ranks 4–8 remain tracked rather than folded into one large implementation. History-preservation risk can block any task that needs deletion regardless of its sequencing rank.

## Roadmap

| Milestone | Deliverable | Exit criteria | Dependencies / scope |
| --- | --- | --- | --- |
| M1 — Post-deploy infrastructure evidence | Deterministic scoped verifier | Expected SHA/digests, Argo revision/state, complete rollout, pods/restarts/logs/health recorded; negative cases fail | Read-only access and expected revision; not business acceptance |
| M2 — Authenticated finance smoke | One real nonproduction expense flow | Identity/workspace verified; before/action/after and exact deltas; same-key retry; evidence retained safely | Approved sandbox/identity/action; M1; no delete cleanup |
| M3 — Real Mongo verification | Disposable transaction-capable integration harness | Real rollback, idempotency, installed unique constraints and concurrent duplicate results; CI isolated from production | Node tests/Mongoose retained; standalone development Mongo is insufficient |
| M4 — Financial regression suite | Stronger production-function/service oracles | Payment/spending/debt/receivables/isolation cases, meaningful boundary failures; no constant-only oracle | L05 can start locally early; DB-sensitive acceptance uses M3 |
| M5 — Agent bounded delivery | LUNA local work → approved delivery → M1/M2 → ASTRA review | Proven candidate path, scoped authorization, same-artifact evidence and failure behavior | M1–M4 sufficient for affected capability; current coding-task deploy ban retained |
| M6 — Eval-driven improvement | Curated task/evidence failure cases | Measure false PASS, missing checks, correct escalation and rework against deterministic outcomes | Stable verification; no Judge Agent or multi-agent platform |

Verified Delivery is not complete at M1 alone. M3 can be implemented before M2 execution if the approved sandbox depends on it. Milestones describe outcomes, not a requirement to wait on unrelated work. R3 behavior requiring real persistence proof cannot be released merely because M2's simple expense passes.

## First five LUNA tasks

Each packet is independently reviewable/useful. Read named sections as excerpts rather than loading entire maps. New file paths are proposed allowed outputs, not existing tooling. Package AGENTS applies automatically. No external writes or deployments are authorized by any packet below.

### L01 — Make existing smoke truthful

# LUNA TASK

ID: L01

GOAL: Convert the stale `smoke:deploy` script into an explicitly public reachability/catalog smoke, with truthful limits.

WHY: It currently lacks authentication, accepts redirects for a private page and assumes an incorrect summary shape. Removing unsupported business claims avoids a false delivery signal while M2 is designed.

RISK: R2; verifier semantics, no production behavior change.

FILES TO READ: `frontend/scripts/smoke-test.mjs`, `frontend/package.json`, `frontend/proxy.ts`; `.ai/DELIVERY_MAP.md#health-and-version`, `.ai/EVIDENCE_CONTRACT.md#proof-boundaries`.

FILES ALLOWED TO MODIFY: `frontend/scripts/smoke-test.mjs`; new `frontend/tests/smoke.test.mjs`; `frontend/package.json` only to register that test; `README.md` only the smoke usage/limitations paragraph.

DO NOT MODIFY: Auth/API handlers, finance code, CI/GitOps, credentials, existing unrelated test lists.

CONTEXT: Public `/login` is reachable; catalog empty is valid. Anonymous `/api/accounts` is 401. Public `/ready` is 404. Do not add auth bypass or claim financial correctness. Endpoint auth/shape contracts remain unchanged.

SKILL: `.ai/skills/code-change.md`.

ACCEPTANCE CRITERIA: Public checks accurately assert their contract; empty catalog handled intentionally; redirects do not count as authenticated success; no protected finance request without identity; output clearly names public-only scope; failed required public checks exit nonzero.

VERIFICATION: Existing frontend lint/typecheck/default tests; new Node fixture-HTTP tests for empty/nonempty catalog, redirect, invalid JSON, HTTP error and timeout. No live target required; no build needed if only Node script/docs change, explain applicability.

REQUIRED EVIDENCE: Diff, exact commands/results, expected/actual fixture outcomes, explicit unsupported authenticated/DB claims, full evidence-contract record.

FINAL STATUS: PASS / PARTIAL / FAIL / BLOCKED

### L02 — Infrastructure verifier

# LUNA TASK

ID: L02

GOAL: Add a read-only Node verifier of expected Argo and Kubernetes delivery state, producing a structured evidence record.

WHY: Manual observations exist; no repeatable candidate-bound result currently links expected images to ready workloads.

RISK: R2; read-only operational tooling. No delivery permission.

FILES TO READ: `.ai/DELIVERY_MAP.md#health-and-version`, `.ai/EVIDENCE_CONTRACT.md#required-record`, `.ai/skills/k8s-delivery-verify.md`; external `../k8s-namepsace-chart/card-credit/templates/frontend.yaml`, `backend.yaml`, `ingress.yaml` as needed for names, read-only.

FILES ALLOWED TO MODIFY: New `scripts/verify-delivery.mjs`, `scripts/tests/verify-delivery.test.mjs`; `.ai/DELIVERY_MAP.md` only verifier invocation/evidence links after implemented.

DO NOT MODIFY: Application source/package orchestration, CI, GitOps manifests, cluster state, secrets or application data.

CONTEXT: Namespace `card-credit` and deployments `card-credit-frontend/backend` are historical baseline names, not default authorization. Expected app SHA differs from expected GitOps revision. Require explicit context/namespace/application/expected references. Public readiness is not routed.

SKILL: `.ai/skills/k8s-delivery-verify.md`.

ACCEPTANCE CRITERIA: Structured expected/actual record for every skill check; bounded commands; no shell-interpolated user input; wrong/mixed/stale image or revision, incomplete replicas/rollout, missing required fields/log/health evidence cannot PASS. Zero desired replicas cannot PASS. Non-PASS gate returns nonzero. No apply/patch/sync/exec/create/secret read. Internal health endpoint can be explicitly supplied; verifier does not silently create access tunnels.

VERIFICATION: `node --test scripts/tests/verify-delivery.test.mjs`; fixture command/HTTP adapters exercise healthy and all above failure states, permission denial and timeout; optional live read only if task explicitly supplies target/access, otherwise state live validation unperformed.

REQUIRED EVIDENCE: Diff, test output, sanitized sample PASS and non-PASS records, supported evidence scope and any unverified live access.

FINAL STATUS: PASS / PARTIAL / FAIL / BLOCKED

### L03 — Specify the first authenticated smoke

# LUNA TASK

ID: L03

GOAL: Produce an implementation-ready scenario design for one authorized nonproduction debit-expense smoke using exact current contracts.

WHY: Financial correctness needs authenticated before/action/after proof; identity/environment and fixture lifecycle are not yet established.

RISK: R3 design-only; no runtime mutation.

FILES TO READ: `.ai/SYSTEM_MAP.md#transactions`, `.ai/FINANCIAL_INVARIANTS.md#integer-vnd`, `#workspace-isolation`, `.ai/skills/business-smoke.md`; `backend/src/auth-routes.ts`, `account-routes.ts`, `financial-transaction-routes.ts`, `financial-report-routes.ts`; `shared/src/auth-contracts.js`, `account-contracts.js`, `transaction-contracts.js`, `report-contracts.js`; `frontend/playwright.config.ts`, `frontend/tests/e2e/split-runtime.spec.ts`.

FILES ALLOWED TO MODIFY: `.ai/skills/business-smoke.md` only exact request/assertion/fixture details; `.ai/BACKLOG.md` only this task's follow-up/blockers after review.

DO NOT MODIFY: Production code, tests, CI/GitOps, secrets, accounts, data, approval policy.

CONTEXT: Planned baseline is isolated DEBIT account, one 1,000 VND personal expense and exact spending/cash/debt deltas. No current identity/environment is authorized. Use normal login, real cookie semantics and exact workspace verification; never bootstrap production admin or delete financial records to clean up.

SKILL: `.ai/skills/business-smoke.md`.

ACCEPTANCE CRITERIA: Trace exact login/action/readback schemas; define fixture baseline, auth/CSRF handling, run-key retry, assertion oracle, bounded waits and redaction; define host/workspace mismatch rejection; list precise missing environment/identity decisions. Separate design completion from blocked execution. Use existing Playwright for authenticated browser behavior; no new framework.

VERIFICATION: Contract-to-scenario review and reference checks; no network/login/action required. Explicitly record runtime verification BLOCKED until prerequisites are supplied. Overall design-only task can PASS if all design criteria and blocker inventory are complete.

REQUIRED EVIDENCE: Exact contract references, before/action/after example, failure/blocker behavior, fixture retention/destruction boundary, proposed runnable follow-up scope, design-only result.

FINAL STATUS: PASS / PARTIAL / FAIL / BLOCKED

### L04 — Real Mongo integration harness

# LUNA TASK

ID: L04

GOAL: Add a disposable single-node replica-set Mongo test harness with real guarded transaction rollback, idempotency and index/contention assertions.

WHY: Fake sessions cannot establish financial atomicity or unique-index behavior.

RISK: R3 local test infrastructure; external database maintenance prohibited.

FILES TO READ: `.ai/FINANCIAL_INVARIANTS.md#command-atomicity-and-replay`, `#unique-financial-identities`; `backend/package.json`, `backend/tsconfig.json`, `backend/src/services/command-guard-service.ts`, `backend/src/models/command-preview.ts`, `command-receipt.ts`, `command-audit.ts`, `account.ts`, `financial-transaction.ts`; `backend/tests/command-guard-service.test.ts`; `.github/workflows/ci.yml` read-only.

FILES ALLOWED TO MODIFY: New `backend/scripts/test-mongo-integration.mjs`; new `backend/tests/integration/command-guard.mongo.test.ts`; `backend/package.json` only new explicit `test:mongo` command. If typecheck excludes the new files, propose the minimal separate change rather than expanding scope silently.

DO NOT MODIFY: Production services/models, existing test expectations, runtime secrets, shared DBs, CI/GitOps in this first slice.

CONTEXT: Keep Node test + Mongoose. Use pinned Mongo image/version selected and recorded during implementation; Docker-launched throwaway replica set, private/local endpoint, unique run-owned data and no inherited production URI. No general application Compose environment is required.

SKILL: `.ai/skills/finance-change.md`.

ACCEPTANCE CRITERIA: Harness provisions/initiates/waits for actual replica-set primary, installs relevant actual model indexes, and runs real service/model operations. Injected failure after business write rolls back write/receipt/success audit; same-key retry commits once; same-key different payload rejects; actual unique violation rejects; concurrent duplicates yield one committed effect with defined retry behavior. Assert database contents after operations. Fail closed if Docker unavailable or target identity not owned; cleanup only own container/volume after collecting evidence; timeout/interruption handled. Never skip tests as success.

VERIFICATION: Backend lint/typecheck/default suite per AGENTS plus new `npm --prefix backend run test:mongo`; record real replica-set version/topology and index metadata. If Docker cannot run, harness behavior may be tested locally but real-DB acceptance is BLOCKED. CI wiring becomes a subsequent small task after local proof and trust review.

REQUIRED EVIDENCE: Diff, commands, real rollback/idempotency/contention counts, installed index evidence, isolation/cleanup evidence, limitations; no external URI or credentials.

FINAL STATUS: PASS / PARTIAL / FAIL / BLOCKED

### L05 — Strengthen statement settlement invariant

# LUNA TASK

ID: L05

GOAL: Add a production-function regression proving reimbursement cannot masquerade as statement payment and settlement does not create duplicate personal expense.

WHY: Current coverage includes constant-only net-assets arithmetic; critical payment behavior needs direct, independent assertions rather than confidence in test counts.

RISK: R3 financial test oracle; production changes excluded.

FILES TO READ: `.ai/SYSTEM_MAP.md#payments`, `.ai/FINANCIAL_INVARIANTS.md#statement-payment`, `#reimbursement-and-offsets`; `backend/src/financial-domain.ts`, `backend/src/services/statement-payment-command-service.ts`, `backend/tests/accounting-invariants.test.ts`, `backend/tests/statement-payment-command-service.test.ts`.

FILES ALLOWED TO MODIFY: `backend/tests/accounting-invariants.test.ts`, `backend/tests/statement-payment-command-service.test.ts`.

DO NOT MODIFY: Production financial code/contracts, database, CI, unrelated tests or existing valid expectations.

CONTEXT: Charge 10,000 VND; reimbursement 9,000 must not settle 10,000 card debt; actual 10,000 statement payment has -10,000 cash/debt impact and zero new spending. Use production helpers and controlled fixtures with independently calculated expectations. This does not claim real persistence or solve the unrelated net-assets oracle gap.

SKILL: `.ai/skills/finance-change.md`.

ACCEPTANCE CRITERIA: Named tests execute actual helpers/service boundaries, assert reimbursement-vs-payment separation and no second expense, cover one meaningful negative/state case. Tests fail if those semantics are broken; no redundant constant-only assertion. If production behavior violates supported rules, return FAIL with evidence rather than rewriting code/expected output in this task.

VERIFICATION: Targeted `node --import tsx --test tests/accounting-invariants.test.ts tests/statement-payment-command-service.test.ts` from backend; backend lint/typecheck/default tests as required. Report deterministic vs mocked boundaries. Real database not claimed; task can pass its explicitly pure/mocked scope.

REQUIRED EVIDENCE: Diff, test names/commands/results, independent expected arithmetic and invariant mapping, reason tests detect the regression, remaining M3/M2 gap.

FINAL STATUS: PASS / PARTIAL / FAIL / BLOCKED

## Deferred follow-ups

Readiness disconnect/round-trip semantics; safe public/internal health contract; approved M2 implementation and CI integration; real-Mongo CI job after L04; replace constant-only report oracle; resolve history void/archive/correction semantics; durable failure audit; stale role/runbook references; branch-variable/retention proof; sandbox GitOps and promotion policy. Each gets a separate risk-scoped packet when its prerequisites exist.
