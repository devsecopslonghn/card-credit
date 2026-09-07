# Finance change

Use for transactions, balances, statements, payments, reimbursement, fees and cashback, including tests that define their expected results. This workflow supplements [code change](code-change.md), not a new implementation framework.

## Inputs

R3 task packet; selected anchors from [financial invariants](../FINANCIAL_INVARIANTS.md); exact contracts/service/model/tests; approved fixture scope if runtime verification is required. Do not read unrelated domains.

## Procedure

1. Name the affected invariant and its current verification strength. Distinguish implementation behavior, required instruction and known violation; hard deletion is a violation, not a new accepted invariant.
2. Specify an independent integer-VND oracle before changing code: initial amounts, one action, exact spending/cash/debt deltas, offsets and expected rejection cases. Do not derive expected results using the same function under test.
3. Preserve workspace/parent links, IDs, receipt/audit semantics, currency, existing enum validation and idempotency. Guarded actions must keep atomic receipt + business write + success audit behavior. Preview must not create ledger transactions; allowed hash-only confirmation metadata is not ledger mutation.
4. Execute production functions in deterministic tests. Include affected boundaries: duplicate request, payload mismatch, expired preview, invalid offset/amount and cross-workspace resource as relevant. No constant-only arithmetic test or edited expectation to bless a regression.
5. If transaction/index/atomicity behavior changes, require isolated real Mongo evidence for the affected behavior. A mocked session cannot satisfy that criterion. If harness is unavailable, local implementation can be reviewed but that required criterion is BLOCKED/PARTIAL and cannot be accepted as release-ready.
6. If claiming deployed finance behavior, use [business smoke](business-smoke.md) with approved identity/data; pair results with [infrastructure evidence](k8s-delivery-verify.md). Report before/action/after and exact invariant comparisons.

## Boundaries and evidence

No production records, repairs, index apply or generic financial delete cleanup. Never bypass auth/preview to make tests run. Do not expand a task into history-preservation redesign; report the conflict to ASTRA. Explicit human confirmation for financial repairs remains required by AGENTS.

Return invariant IDs, executed test cases, mock/real database distinction, build identity, sensitive-data-safe artifacts and one status per [evidence contract](../EVIDENCE_CONTRACT.md). Model confidence is not a financial oracle.
