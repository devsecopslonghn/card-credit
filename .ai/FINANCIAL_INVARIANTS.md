# Financial invariants

Source: assessment sections 4, 5, 7. Paths are application-relative. Existing test names identify evidence to inspect, not a claim that every test was run: discovery ran curated defaults only.

Strength labels: **DETERMINISTICALLY VERIFIED** = assertions execute the relevant pure production function; **ONLY MOCKED** = service/transport/persistence collaborators are simulated; **RUNTIME / DATABASE UNVERIFIED** = actual storage or deployed workflow not demonstrated. A rule can have different strengths at different boundaries. No LLM Judge may replace arithmetic/database assertions.

## Integer-VND

Invariant: domain transaction amounts are positive safe integers; offsets are nonnegative safe integers; account currency is VND. Percentage fees round using existing domain semantics.
Relevant code: `backend/src/financial-domain.ts`, `models/account.ts`.
Existing test: `backend/tests/financial-domain.test.ts`; `accounting-invariants.test.ts` exercises domain impact.
Verification strength: DETERMINISTICALLY VERIFIED for tested pure input/impact cases; RUNTIME / DATABASE UNVERIFIED for all writers/aggregates.
Known gap: Mongoose Number minimums do not enforce safe integers everywhere; aggregate overflow/rounding boundaries need explicit tests. Do not claim decimal-library guarantees.

## Credit-expense

Invariant: a credit expense adds gross credit debt without immediate debit cash movement; personal spending remains a distinct impact.
Relevant code: `backend/src/financial-domain.ts`.
Existing test: `backend/tests/financial-domain.test.ts` (extended-suite file).
Verification strength: DETERMINISTICALLY VERIFIED by pure-function cases when run; persisted/deployed path RUNTIME / DATABASE UNVERIFIED.
Known gap: no authenticated credit-charge scenario was demonstrated; record exact tests executed for each future task.

## Statement-payment

Invariant: statement settlement reduces credit debt and paying cash/debit, without another personal expense. Statement payments are not directly deletable through generic transaction deletion; idempotent retry must not duplicate settlement.
Relevant code: `backend/src/financial-domain.ts`, `services/statement-payment-command-service.ts`, `services/financial-transaction-service.ts`.
Existing test: `backend/tests/statement-payment-command-service.test.ts`, `accounting-invariants.test.ts`, `command-guard-service.test.ts`.
Verification strength: DETERMINISTICALLY VERIFIED for helper arithmetic/state transitions; ONLY MOCKED for service/guard persistence; RUNTIME / DATABASE UNVERIFIED for atomic settlement.
Known gap: real transaction/index/retry evidence absent. First strengthening task must call production calculations, not just assert constants.

## Reimbursement-and-offsets

Invariant: reimbursement alone does not reduce card debt; expected reimbursement plus refund cannot exceed the charge. Paid-for-other spending and receivable recovery remain separate from bank settlement.
Relevant code: `backend/src/financial-domain.ts`, payment totals in `services/statement-payment-command-service.ts`.
Existing test: `backend/tests/accounting-invariants.test.ts` (reimbursement/debt examples), `financial-domain.test.ts`.
Verification strength: DETERMINISTICALLY VERIFIED for tested helpers; RUNTIME / DATABASE UNVERIFIED for linked persisted records.
Known gap: no full reimbursement → payment → report scenario against actual MongoDB. Do not conflate reimbursement, refund and cashback.

## Technical-adjustments

Invariant: technical opening/balance adjustment can have zero operating-spending impact; reopening PAID through the correction helper requires a reason. These statements do not imply all adjustment directions have zero cash impact.
Relevant code: `backend/src/financial-domain.ts`, `services/statement-payment-command-service.ts`.
Existing test: `backend/tests/accounting-invariants.test.ts`.
Verification strength: DETERMINISTICALLY VERIFIED for those exact helper cases; runtime repair unverified.
Known gap: no production repair authorization is conveyed; root AGENTS requires human confirmation for financial repairs.

## Workspace-isolation

Invariant: private reads/commands derive a trusted workspace/user and cannot operate on another workspace's resources; parent resource relationships remain scoped.
Relevant code: `backend/src/context.ts`, `runtime-routes.ts`, service filters and workspace fields in models.
Existing test: `backend/tests/private-read-context.test.ts`, `admin-context.test.ts`, `context.test.ts`, route/service boundary tests.
Verification strength: ONLY MOCKED at transport/repository boundaries; RUNTIME / DATABASE UNVERIFIED for a two-workspace deployed scenario.
Known gap: explicit filters can be omitted by future code; signed-session fallback is weaker than repository-backed context. Need both positive and cross-workspace negative cases for affected capabilities.

## Command-atomicity-and-replay

Invariant: same scoped idempotency key/payload reuses result; conflicting payload fails; preview consumption, financial write, receipt completion and success audit commit atomically for guarded commands. Expired/consumed or mismatched previews fail according to existing contracts.
Relevant code: `backend/src/services/command-guard-service.ts`, `mcp/preview.ts`, `models/command-preview.ts`, `command-receipt.ts`, `command-audit.ts`.
Existing test: `backend/tests/command-guard-service.test.ts`, `mcp-preview.test.ts`, `financial-command-service.test.ts`.
Verification strength: ONLY MOCKED for database transaction/rollback; token helper assertions deterministic; RUNTIME / DATABASE UNVERIFIED for durability/contention.
Known gap: real replica-set rollback/duplicate-key contention absent. Guard writes SUCCESS in its transaction; no claim of durable failure auditing.

## Unique-financial-identities

Invariant: schema declares unique workspace/name and partial card account links, unique workspace/card/statement date and partial unique statement-payment identity.
Relevant code: `backend/src/models/account.ts`, `card-statement.ts`, `financial-transaction.ts`.
Existing test: `backend/tests/accounts.test.ts`, `statement-payment-command-service.test.ts` provide related mocked behavior; no real index test identified by discovery.
Verification strength: RUNTIME / DATABASE UNVERIFIED; declared index is not installed-index proof.
Known gap: external data-integrity hook verifies selected other indexes, not all command indexes. M3 must query installed indexes and provoke actual constraint failures.

## History-preservation-gap

Invariant required by existing instruction: do not hard-delete financial history; preserve IDs and references. **Not an implemented invariant across all services.**
Relevant code: root/backend `AGENTS.md`; `services/financial-transaction-service.ts`, `fee-command-service.ts`, `monthly-cashback-command-service.ts` still use hard deletion.
Existing test: no identified test proves universal history preservation; guarded delete behavior is not such proof.
Verification strength: RUNTIME / DATABASE UNVERIFIED, with confirmed source-level policy conflict.
Known gap: history correction/void/archive semantics need a separate R3 design decision. Business smoke must not clean up with these delete APIs; destroy only an explicitly disposable whole test environment outside application financial semantics.
