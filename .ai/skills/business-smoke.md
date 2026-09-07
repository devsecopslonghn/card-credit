# Authenticated business smoke

Goal: verify one real financial flow after delivery through existing authenticated APIs/UI. Use existing Node/Playwright tooling, shared contracts and Fastify behavior. This is the missing proof after infrastructure readiness; it is not permission to access or mutate production.

## Mandatory preflight

Require a task-supplied nonproduction URL, exact workspace ID, non-admin test identity where possible, credential reference supplied securely, environment owner, permitted action/amount, expected image/GitOps identity, isolation from email/real data, fixture lifecycle and explicit mutation scope. Reject unknown destinations, identity/workspace mismatch, failed auth or missing approval before the financial write. Do not fall back to current namespace, bootstrap an admin, fetch runtime secrets or bypass auth. Rely on existing authorization; do not request it repeatedly.

Run/consume [Kubernetes verification](k8s-delivery-verify.md) for this candidate. Infrastructure PASS is a prerequisite to calling the overall delivery verified, not a substitute for the smoke. Missing real-Mongo guarantees must remain visible for database-sensitive changes.

## First bounded scenario (proposed, not executed)

1. Log in normally with the approved test identity; verify the authenticated identity and exact workspace from the backend. Preserve HttpOnly/Secure cookie and browser Origin/Fetch Metadata semantics. Do not fabricate signed cookies. Choose a trusted HTTPS test URL or a proven supported local cookie setup.
2. Use an isolated pre-provisioned DEBIT account with known baseline and no concurrent writer. Assert account ID/type/workspace, balance at least 1,000 VND, stable report date range/timezone and zero unrelated changes. Read current account, transactions and report via normal APIs. Record sanitized baseline.
3. Submit one PERSONAL EXPENSE for exactly 1,000 VND, no reimbursement/refund/fee, through the existing financial-transaction contract. Use a unique run-scoped idempotency key and record transaction ID as an opaque alias. Exact payload fields/endpoints must be checked in the assigned source before implementation; this document does not invent an API shape.
4. Fresh reads must show exactly one new expense, account balance delta -1,000 VND, personal spending delta +1,000, debit cashflow delta -1,000 and credit debt delta 0 in the chosen range. Compare expected deltas independently; 200/201 alone is insufficient. API readback is business-state evidence, not a claim of verified database rollback.
5. Retry the exact same command/key only where included in the approved scenario. Assert the same result identity, one transaction and no additional balance/report delta. Unknown response after timeout must be resolved by readback/same-key semantics, never a fresh-key blind retry.
6. No hard-delete cleanup through transaction/fee/cashback APIs. Prefer discarding the owned ephemeral test database/environment after evidence collection under its lifecycle authorization. If a shared test workspace is used, retain the approved fixture and record it; no ad hoc compensating transaction or history deletion. Unexpected state stops further mutation.

## Failure and blocker handling

Unauthenticated read-only checks can be reported separately but cannot pass this scenario. Missing safe identity/environment/action authorization gives BLOCKED. Assertion failure gives FAIL and preserves sanitized diagnostics; no automatic financial repair. A flow that passes mocks only remains PARTIAL for deployed behavior. Bound attempts/timeouts and record unexecuted checks.

Future statement-payment/reimbursement flows need separate fixtures, exact preview/confirmation rules and invariant checks; this first expense scenario cannot certify them. Include cross-workspace negative tests in local/integration suites and later approved two-workspace runtime scenarios, not by probing arbitrary user records.

## Output

[EVIDENCE_CONTRACT](../EVIDENCE_CONTRACT.md): candidate identity, environment/workspace alias, login identity assertion, before/action/after, invariant deltas, idempotency result, retained/disposed fixture state, artifacts and PASS/PARTIAL/FAIL/BLOCKED. No credentials, raw cookies, preview tokens or real financial records in artifacts.
