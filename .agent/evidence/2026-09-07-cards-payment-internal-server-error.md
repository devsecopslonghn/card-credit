# Evidence: cards payment internal server error

Task ID / risk / scope: 2026-09-07-cards-payment-internal-server-error / R3 / statement payment index and reconciliation hook, regression test.

Claim: `/cards` statement payment no longer remains blocked by a voided historical payment row. The uniqueness invariant now allows one non-voided `STATEMENT_PAYMENT` per workspace/statement while preserving workspace scoping and append-only void history.

Runtime trace: sanitized backend log for the affected PATCH showed `POST .../payment/preview` status 200, followed by `PATCH .../payment` status 500. The error was Mongo `E11000` on `statement_payment_unique` for `(workspaceId, statementId, transactionType)`. No credentials, cookies, tokens, or financial amounts were recorded. No runtime mutation was performed.

Code evidence:

- `backend/src/models/financial-transaction.ts`: partial unique filter now includes `voidedAt: null`.
- `backend/scripts/ensure-data-integrity-indexes.ts`: reports active duplicate payment groups, refuses unsafe application when any exist, and reconciles the old named index to the corrected definition.
- `backend/tests/statement-payment-command-service.test.ts`: regression assertion requires the corrected index definition.

Deterministic checks (2026-09-07 UTC):

- `npm --prefix backend test -- --test-name-pattern='payment|statement payment'` — expected and actual: pass; 177 curated backend tests.
- `./.agent/gates/verify.sh` — expected and actual: pass; shared 28 tests, frontend critical 49 tests, backend 177 tests, frontend/backend builds; exit code 0.
- `git diff --check` — pass.

Financial/integrity considerations: payment reads and writes remain filtered by `workspaceId`, `cardId`, and `statementId`; payment state transitions and command-guard idempotency were not bypassed. The index reconciliation preflight does not remove ledger rows and blocks if active duplicates would make the corrected unique index unsafe.

Limitations: no real Mongo transaction/index test was available in the local harness; the runtime log is production-visible diagnostic evidence only. The index reconciliation must run through the existing authorized deployment hook for an already-installed old index. No deployment was performed.

Result: PASS
