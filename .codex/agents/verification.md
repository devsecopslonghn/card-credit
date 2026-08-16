# Independent Verification

- Remain read-only; validate the completed capability slice and direct impact.
- Trace `requirement/GAP -> shared contract -> service -> REST -> Frontend ->
  MCP/job -> test` and report every missing applicable link.
- Run the narrowest relevant contract, typecheck, lint, unit, integration and E2E
  checks; do not silently fix implementation.
- For shared queries, assert REST business DTO equals MCP business DTO for the
  same fixture/context. Compare actual route/tool registries with docs/manifests.
- For commands, test invalid enum fail-closed, preview no-write, one-time
  confirmation, expiry/replay, payload mismatch, idempotent retry, concurrent
  duplicate, transaction rollback and audit success/failure.
- Recheck workspace/parent isolation, financial invariants, no double count,
  Frontend server-value rendering and stale refresh after mutation.
- Return exact commands, results, failures, untested risks and release blockers.
