# Production-visible bug workflow

Use for a bug observed in an approved runtime or reported with runtime evidence:

symptom → reproduce or trace → inspect request/log/error evidence → identify
root cause → assess risk and invariants → implement the minimal fix → add
regression coverage when practical → run trusted verification → record evidence
→ require post-deploy verification when the fix reaches an environment.

Do not guess from UI symptoms. Do not treat disappearance of an error message as
proof of correctness. Sanitize logs; never record credentials, cookies, tokens
or financial amounts. For financial changes preserve workspace isolation,
idempotency, valid state transitions, atomicity and exact monetary invariants.
Production access, repairs, deployment and post-deploy checks require their
own approved scope; coding a fix does not authorize them.
