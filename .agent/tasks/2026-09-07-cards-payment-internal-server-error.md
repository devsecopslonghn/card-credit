# Task: cards payment action internal server error

- task: Fix the production-visible `/cards` action “Đánh dấu đã thanh toán” returning Internal server error.
- status: completed
- risk: R3 financial statement settlement
- scope: frontend cards payment caller; backend statement-payment route/service; shared payment contract if required; focused regression tests; task evidence and state.
- acceptance: trace the request to the actual root cause, preserve workspace scoping/state-transition/idempotency/financial invariants, add a regression test, and pass `.agent/gates/verify.sh`.
- root cause: the installed `statement_payment_unique` index included voided historical statement-payment rows, while normal reads excluded those rows; Mongo raised E11000 during a new settlement and the retry surfaced as HTTP 500.
- completed work: scoped the unique index to non-voided payments and taught the existing data-integrity hook to reconcile the installed index definition.
- verification: `.agent/gates/verify.sh` exited 0; focused backend payment run passed and trusted default gate passed.
- evidence: `.agent/evidence/2026-09-07-cards-payment-internal-server-error.md`
- blocker: none
- next action: trace frontend request through backend route and service.
