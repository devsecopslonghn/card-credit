# Task: make deployment smoke scope truthful

- task ID: 2026-09-07-public-smoke-scope
- type: verification
- risk: R2
- status: completed
- symptom/goal: The deployment smoke invokes session-protected frontend endpoints without authentication while claiming database-backed business-read coverage; make its public-only scope executable and explicit.
- scope: frontend/scripts/smoke-test.mjs; frontend/tests/smokeBoundary.test.mjs; frontend/package.json only if needed; README smoke paragraph; task evidence and state.
- relevant invariants: Public smoke must not claim authenticated financial correctness; protected endpoints must not be treated as anonymous public probes; failed required public checks return nonzero.
- plan: Reproduce the anonymous fixture failure, reduce the script to public reachability/catalog/image checks, add fixture HTTP regression coverage for redirects, malformed JSON, HTTP errors and timeout, run frontend checks and the trusted default gate, record evidence and push.
- work completed: Re-scoped the deployment smoke to public login/catalog/image checks, made empty catalogs valid, added bounded request failure reporting, and added deterministic HTTP fixture regression coverage.
- verification: Focused frontend smoke tests passed 9/9; frontend lint passed; `./.agent/gates/verify.sh` passed with exit code 0.
- blocker: none
- next action: none
