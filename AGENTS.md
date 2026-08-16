# Card Credit — Agent Working Agreement

## Mission

Evolve Card Credit as a modular monolith where each use case has one canonical
backend application service and one shared contract. Frontend REST, MCP and jobs
are adapters of that service; they must not become separate business systems.

Use these maintained documents as the planning baseline:

- `docs/SRS.md`: AS-IS behavior, TO-BE integration requirements and GAP register.
- `docs/frontend-mcp-backend-unification-plan.md`: dependency-ordered delivery plan.
- `docs/finance-source-of-truth.md`: authoritative financial collections.

Always distinguish `AS-IS`, `TARGET`, `GAP`, `DEPRECATED` and `DECISION`. Never
describe target behavior as implemented without code and test evidence.

## Non-negotiable operating rules

- Inspect instructions, git state, relevant code, docs and tests before editing.
- Preserve unrelated user changes; make the smallest safe, reversible change.
- Do not commit, push, deploy, mutate infrastructure/data or trigger CI without
  an explicit request.
- Start production/shared/cloud/database work with read-only discovery. State
  exact target, blast radius and rollback before any authorized mutation.
- Keep the modular monolith unless an approved ADR changes the architecture.
- Remove duplicate/dead paths in the same migrated slice. Do not create a second
  source of truth as temporary convenience.
- Preserve compatibility only through an explicit adapter with owner, tests,
  telemetry or consumer evidence, and a removal milestone.

## Capability ownership

Plan and deliver by business capability, not by technical layer:

1. Access & Tenancy.
2. Card Portfolio & Catalog.
3. Financial Ledger.
4. Credit Billing & Settlement.
5. Benefits & Fees.
6. Financial Planning.
7. Reporting & Insights.
8. Engagement & Communications.

Integration Contracts and Platform & Quality are cross-cutting concerns, not
independent business capabilities.

One capability owner is accountable end-to-end for contract, domain/service,
persistence, REST, MCP when applicable, Frontend, tests and documentation. Do
not mark a slice complete as “backend done; frontend/MCP later” unless the SRS
explicitly defines it as API-only.

## Canonical architecture

```text
Frontend -> REST adapter --+
MCP -----> MCP adapter -----+-> application service -> domain -> repository
Job -----> Job adapter -----+
```

- `shared/` is the target source of truth for runtime schema, DTO, enum, error
  code and contract version. Do not add new shadow DTO/schema elsewhere.
- Routes/tools/jobs authenticate, create trusted context, parse canonical input,
  call a service and map the transport envelope. They do not query Mongoose or
  calculate business values.
- Services receive canonical input plus trusted `ServiceContext`; they never
  receive Fastify request/reply, cookie, token or tenant scope from AI/browser
  payloads.
- Domain functions own formulas and state transitions. Repositories/models own
  persistence only.
- REST and MCP may use different envelopes, but the business DTO inside must be
  identical and validated by parity tests.
- Frontend owns presentation, accessibility and UI orchestration. It must render
  backend-calculated totals/impact/status and must not reimplement authoritative
  financial or eligibility logic.
- Browser code must never call `/mcp` or receive `MCP_HTTP_TOKEN`.

## Trusted context and authorization

- Browser context comes from an expiry-checked, revalidated session/user.
- MCP uses Streamable HTTP `/mcp`, Bearer authentication and one server-configured
  fixed `MCP_USER_ID`/`MCP_WORKSPACE_ID`. AI cannot select or switch tenant/user.
- Job context uses an explicit trusted identity and bounded workspace scope.
- Context must carry actor channel and correlation ID for audit.
- Scope every private read/write by `workspaceId`; validate every parent resource
  in the same workspace before using its ID.
- Never trust client-provided `userId`, `role`, `workspaceId`, account type,
  calculated amount, payment state or report total.

## Command safety

- Query paths are read-only and bounded by filters/pagination appropriate to the
  dataset.
- MCP mutation always follows `preview -> explicit human confirmation ->
  idempotent execute -> append-only audit`.
- Browser mutation with financial, delete, merge, import or state-transition
  impact must call the same preview/execute application service even when the
  UI confirmation flow differs.
- Preview performs no business write/side effect. It resolves scoped resources
  and returns normalized input, affected resources, backend-calculated effects,
  warnings, versions and expiry.
- Confirmation must be one-time and bind operation, actor/channel, workspace,
  canonical payload hash, resource ID/version, nonce, contract version and
  expiry. An AI echo of a token is not by itself proof of human approval.
- Idempotency is generic infrastructure, not MCP-specific. Reserve keys
  atomically, reject payload mismatch and keep business write/result receipt in
  one transaction when possible.
- Every REST command mutation must require an explicit `Idempotency-Key` and
  pass a fixed `CommandInvocation` (`idempotencyKey`, endpoint/tool, optional
  preview ID); do not silently bypass the guard or generate a key server-side.
- When replacing legacy `McpMutationModel` writers, read legacy receipts inside
  the same command transaction and fence/drain old command-writer pods before
  enabling new `CommandReceipt` writers. Do not run old/new receipt systems
  concurrently without an approved dual-write transition.
- Audit is separate from idempotency. Record actor/channel, workspace,
  operation, endpoint/tool, correlation/preview ID, resources, outcome and safe
  error code; never raw secrets or sensitive payloads.

## Financial and data invariants

- `Account` + `FinancialTransaction` are authoritative for balances, spending,
  receivables, cash flow and repayments.
- `CardStatement` is authoritative for billing period and payment lifecycle.
- `MonthlyCardCashback` is bank cashback by month; `CardFeePayment` is actual
  card fee. Transaction cashback/refund/reimbursement remain distinct events.
- Preserve safe integer VND, canonical ISO dates, statement uniqueness, correct
  payment transitions and no double-count of expense, payment, cashback or fee.
- Protect multi-document commands with MongoDB transactions where required,
  unique/CAS guards, idempotency and reconciliation tests.
- Card delete/merge, migration and compatibility removal must define referential
  policy, dry-run, backup/recovery and rollback before implementation.

## Vertical-slice workflow

1. Map `Requirement/GAP -> contract -> service -> model -> REST -> Frontend ->
   MCP/job -> tests`; state scope, assumptions, risks and rollback.
2. Freeze canonical input/output/error and compatibility decision in `shared/`.
3. Implement/test domain, application service and repository behavior.
4. Make REST and MCP/job thin adapters of the same service.
5. Implement typed Frontend client/UI using canonical DTO and server results.
6. Run contract, workspace, financial, concurrency, parity and targeted E2E
   checks in proportion to risk.
7. Remove replaced logic and update SRS, OpenAPI/MCP inventory, migration notes
   and compatibility ledger in the same slice.

Do not begin adapter/UI implementation when the canonical contract or source of
truth is undecided. Stop and request the missing decision if different choices
would change persisted data, authorization, public contract or financial result.

## Multi-agent coordination

- Use `.codex/agents/` roles for focused work. Assign one capability lead and
  bounded specialists only after the contract/write-set is clear.
- Give each writing agent an exclusive file set. Only the assigned contract
  steward may modify shared schemas for that slice.
- Do not run independent Frontend and MCP redesigns for the same use case. Both
  must consume the contract/service chosen by the capability lead.
- Parallelize only cleanly separable read-only reviews or non-overlapping write
  sets. Preserve user changes and other agents' edits.
- Verification is independent and must not silently fix implementation.

## Definition of done and handoff

A slice is done only when:

- one canonical contract and service power every applicable adapter;
- no business rule remains duplicated in route, MCP tool, job or Frontend;
- workspace/parent validation, financial invariants, concurrency, idempotency
  and audit have focused evidence;
- REST/MCP parity and Frontend critical flow tests pass when applicable;
- old code is deleted or has a documented compatibility owner/removal gate;
- SRS, plan/status, OpenAPI/tool inventory and runbook are current.

Report outcome, changed files, exact commands/results, operational impact,
remaining risk and rollback. Never claim an unrun check passed.
