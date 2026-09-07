# AI-assisted development and delivery

## A. Decision Summary

Status: architecture/context setup only, 2026-09-05. No implementation task, environment change or permission expansion is authorized by these documents.

The factual baseline is [repository discovery](../.ai-discovery/REPOSITORY_ASSESSMENT.md). Preserve Fastify services, shared contracts, Node tests, Playwright, GitHub Actions, GHCR and external Helm/Argo ownership. Add capability-specific verification and evidence using these existing tools. Do not add Jenkins, a replacement CI/deployment system, vector database, RAG, coordinator swarm or Judge Agent.

Infrastructure health is not equal to business correctness. Arithmetic, isolation, idempotency and persistence require deterministic checks; model review cannot replace them. An unverified prerequisite remains a blocker, never an assumed capability.

Naming decision: **Verified Delivery** is the umbrella objective called “M1” in the request's architecture-priority section. The ordered roadmap retains **M1 infrastructure evidence**, **M2 finance smoke**, then M3–M6. M1 alone cannot complete Verified Delivery; M1+M2 establish the first bounded flow, with M3/M4 needed for database-sensitive acceptance.

## B. Target AI Development Model

```text
Human intent → ASTRA classification/design → bounded task packet
→ LUNA implementation/local verification → evidence → ASTRA
→ ACCEPT / REWORK / ESCALATE
```

ASTRA owns context, decisions, risk, decomposition, verification design, evidence review and knowledge maintenance. LUNA implements scoped work, inspects exact files, runs checks/builds and executes separately authorized sandbox verification. LUNA cannot redesign architecture, widen file scope, weaken acceptance checks or authorize itself to deploy.

Only these two operational roles are selected. Existing `.codex/agents` files are not deleted or automatically invoked. No subagent implementation is started in this setup. ASTRA sends relevant excerpts/anchors and exact files, never the full assessment, full system map or chat history. If the execution mechanism cannot restrict inherited context, provide the packet in a fresh context.

ASTRA ACCEPT means the declared scope has adequate evidence. It does not mean merge, promotion or production approval. REWORK names failed criteria; ESCALATE names an unresolved decision or missing authorization. LUNA evidence status uses the separate four-value contract below.

## C. Proposed `.ai/` Structure

```text
.ai/
  README.md
  CURRENT_STATE.md
  SYSTEM_MAP.md
  DELIVERY_MAP.md
  FINANCIAL_INVARIANTS.md
  EVIDENCE_CONTRACT.md
  RISK_POLICY.md
  AUTONOMY_MATRIX.md
  BACKLOG.md
  skills/
    code-change.md
    finance-change.md
    k8s-delivery-verify.md
    business-smoke.md
```

These four skill files are repository workflow specifications loaded through a task packet. They are not installed/discoverable Codex SKILL.md packages. No installer, auto-loader or additional skill packaging is introduced.

ASTRA maintains stable facts in maps and dated capability evidence in CURRENT_STATE. Change a fact only with its source/revision; label targets and unknowns explicitly. Do not overwrite the discovery snapshot to disguise later changes. Keep raw run evidence in a restricted CI/local artifact location chosen in the packet, not financial data in Git. `.ai` instructions do not supersede user authorization or root/package AGENTS agreements. This phase leaves those files unchanged; discovery's stop condition applied to the prior phase.

## D. Current vs Target Flow

Current: push to master/main → quality → images → GitOps commit → Argo → ready → human judgment.

Target: intent → risk/task → implementation → deterministic checks/build → ASTRA local review → authorized branch push/PR → approved environment delivery → M1 infrastructure evidence → M2 business evidence → ASTRA acceptance → authorized merge/promotion as applicable.

A push must precede the current GitHub-triggered image pipeline. Do not claim a candidate was deployed before it was published. Current mainline pushes can deploy the current namespace; branch pushes/PRs do not supply a sandbox pipeline today. A future candidate/sandbox path requires a separate approved delivery task. No production merge may be justified by evidence from a different SHA.

See [delivery map](DELIVERY_MAP.md).

## E. Evidence Contract

[Evidence contract](EVIDENCE_CONTRACT.md): claim, diff, deterministic checks, build, delivery, runtime, business before/action/after, limitations and result **PASS / PARTIAL / FAIL / BLOCKED**. Each check identifies scope, expected/actual result, timestamp and artifact. Skipped required checks cannot yield PASS. Documentation tasks may mark runtime/build inapplicable with a reason.

## F. Risk Policy

[Risk policy](RISK_POLICY.md): R0 documentation; R1 isolated UI/test work; R2 application behavior; R3 money/security/integrity; R4 critical operational actions. Classify the capability and side effects, not the extension. Acceptance and execution authorization are distinct.

## G. Autonomy Matrix

[Autonomy matrix](AUTONOMY_MATRIX.md) assigns permissions per capability. Repository reads and local checks are established; current-namespace mutation and credential access are not granted. Existing scoped authorization carries forward without repeated approval requests; uncertainty never becomes permission through elapsed time.

## H. First Four Skills

- [Code change](skills/code-change.md): bounded source change and proportional checks.
- [Finance change](skills/finance-change.md): selected invariants, deterministic oracle, persistence limits.
- [Kubernetes delivery verification](skills/k8s-delivery-verify.md): revision/rollout/health evidence only.
- [Business smoke](skills/business-smoke.md): authenticated safe financial action and resulting-state assertions; blocked without an authorized identity/environment.

## I. M1–M6 Roadmap

[Backlog](BACKLOG.md#roadmap) defines exit gates: M1 infrastructure evidence; M2 authenticated finance smoke; M3 real Mongo verification; M4 financial regression; M5 bounded agent delivery; M6 eval-driven improvement. No milestone is complete merely because its playbook exists.

## J. First Five LUNA Tasks

[Five packets](BACKLOG.md#first-five-luna-tasks), proposed and unassigned: L01 correct smoke scope; L02 infrastructure verifier; L03 safe finance-smoke design; L04 isolated real-Mongo harness; L05 strengthen statement-payment invariant. Each lists explicit files, prohibitions, verification and evidence. These are planning artifacts, not execution instructions for this session.

## K. Decisions Deferred

Environment/identity allocation; production classification; sandbox GitOps path; credentials delivery mechanism; permitted database fixture lifecycle; readiness implementation/public routing; history-preserving correction semantics; production rollback/retention; durable failed-command auditing; CI trust boundary for authenticated verification. Preserve current tools while those decisions are resolved.

## L. Open Questions Requiring Human Input

These are recorded for the relevant execution phase; they do not block this documentation setup.

1. Which namespace, URL, database and workspace are approved for disposable verification, and who owns them? Is current `card-credit` production?
2. Which nonproduction identity and secret reference may the verifier use? Which finance actions/amounts and data-retention rules are authorized? Do not paste credentials into these documents.
3. Who may approve sandbox delivery, branch push/PR, mainline merge and promotion, and what existing authorization applies?
4. Who can attest to old-writer fencing and the live command/preview indexes? Where are recovery and source-of-truth runbooks?
5. Where should redacted evidence be retained, for how long, and who reviews failed verification? Which last-known-good images/backups are recoverable?
