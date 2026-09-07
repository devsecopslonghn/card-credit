# Risk policy

This is a task/review policy, not a grant of credentials or production authority. Root AGENTS forbids production writes, MCP repairs confirmed from a coding task and coding-task deployments. Separate delivery/operations assignments require their own scoped authorization. Existing explicit user authorization persists; do not ask for the same authorization again.

Classify by changed behavior, affected data, reversibility and environment. A `.md` delivery instruction or `.test.ts` financial oracle change can be R3; do not classify by extension. Use the highest material risk for combined work or split independent scopes.

| Risk | LUNA may do once assigned | May deploy? | ASTRA automatic acceptance? | Human gate |
| --- | --- | --- | --- | --- |
| R0 documentation/non-runtime | Bounded docs and reference validation | No deployment needed | Yes, scoped doc evidence | No extra gate for authorized docs |
| R1 isolated UI/tests | Local implementation/checks; no money/auth/contract changes | Only separately approved sandbox delivery task | Yes after relevant evidence | Environment/external actions require existing or new scoped authorization |
| R2 normal app/API | Scoped contracts/services/UI changes and tests | Approved sandbox only, separate task | Yes for scoped work if all required evidence exists | Current namespace/merge/promotion require explicit scope |
| R3 financial/security/integrity | Bounded implementation, fixtures, deterministic and isolated real-DB tests | Separate approved sandbox task after ASTRA review | No unattended acceptance; ASTRA must inspect invariant/isolation evidence | Human decides unresolved monetary semantics/security policy; approves affected promotion; repair confirmation remains explicit |
| R4 critical operations | Read-only investigation and concrete operation/recovery proposal | No autonomous deployment/operation | No | Explicit human approval of exact target/action/recovery before operation |

R3 includes account balance, statement payment, financial transactions, reimbursement/fees/cashback, auth/session/workspace isolation, Mongo indexes/transactions and MCP write behavior. R4 includes destructive financial mutation, irreversible DB maintenance, production IAM/secrets and cluster-wide security. A proposed fixture drop is permissible only within an explicitly disposable test database/volume whose ownership is proven; it does not authorize deleting ledger records from a shared environment.

## Escalation and stopping

Stop the dependent action when environment/identity is ambiguous, an unexpected production target appears, preview payload differs, required invariants fail or a task needs files outside its allowlist. Continue independent local analysis/checks within scope. ASTRA can re-scope a task; it cannot invent human approvals. Do not “fix” tests by weakening expectations, disable auth for smoke or repair data while verifying.

## Review outcomes

ASTRA ACCEPT: evidence meets the task's declared scope and risk checks. REWORK: failed/incomplete criterion with a concrete next step. ESCALATE: unresolved semantic/authorization/environment decision. ACCEPT does not authorize Git push, merge, database action or promotion absent the capability authorization in [matrix](AUTONOMY_MATRIX.md).
