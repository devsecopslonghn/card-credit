# Post-deployment verification workflow

This workflow observes an approved deployment; it does not deploy, restart,
rollback or mutate data.

1. Confirm the deployment and expected revision in the approved environment.
2. Identify the exact original symptom and verify the expected user-visible behavior.
3. Verify the relevant API response and persisted/domain state.
4. Verify the relevant invariant, including duplicate/idempotency behavior where applicable.
5. Inspect bounded, sanitized error/log signals when available.
6. Record expected versus actual values and close the task with evidence.

For statement payment, verify that “Đánh dấu đã thanh toán” succeeds, the
statement reaches the expected state, no duplicate ledger/payment effect occurs,
and no `E11000 statement_payment_unique` signal remains.

If the environment, deployment identity, access or approval is unavailable,
stop with `HUMAN_DECISION` or `BLOCKED`; do not infer success from local tests.
