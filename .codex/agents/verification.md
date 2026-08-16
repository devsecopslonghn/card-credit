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
  duplicate, transaction rollback and audit success/failure; verify REST
  `Idempotency-Key` enforcement and old-writer rollout fencing when receipt
  infrastructure changes.
- Recheck workspace/parent isolation, financial invariants, no double count,
  Frontend server-value rendering and stale refresh after mutation.
- Return exact commands, results, failures, untested risks and release blockers.

## CI/CD boundary checks

- Treat the application `Jenkinsfile`, external `ci-platform` and external
  `cd-platform` as separate versioned components. Verify the application
  `sourceDirectories` and package lockfiles against the commands the shared
  library actually runs.
- For this repository, expect CI validation order `shared` → `frontend` →
  `backend`; do not infer image publication or Kubernetes rollout from a Git
  push. Require checkout SHA/SCM/branch evidence for pipeline claims.
