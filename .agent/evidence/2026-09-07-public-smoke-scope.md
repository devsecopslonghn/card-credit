# Evidence: truthful public deployment smoke

- task ID: 2026-09-07-public-smoke-scope
- relevant Git diff/commit: `3c75bb6 fix: make deployment smoke public-only`; changed `frontend/scripts/smoke-test.mjs`, `frontend/tests/smokeBoundary.test.mjs`, `README.md`, and task record.
- root cause or implementation claim: The prior smoke called session-protected `/api/cards` anonymously and then `/api/financial-reports/summary`; a deterministic fixture returned `401 UNAUTHENTICATED` at the cards call, proving the advertised database-backed smoke could not pass without authentication. The implementation now checks public `/login`, public catalog JSON, and optional product detail/image paths only; empty catalog is valid. Backend health/readiness remains explicitly opt-in through `SMOKE_BACKEND_BASE_URL`.
- commands/checks executed: `node --test tests/smokeBoundary.test.mjs` from `frontend`; `npm run lint -- --no-warn-ignored` from `frontend`; `git diff --check`; `./.agent/gates/verify.sh` from repository root.
- exit/result summary: Pre-fix anonymous fixture reproduced `[smoke] FAIL cards list returned HTTP 401`; focused regression passed 9/9 tests; frontend lint passed with 0 errors/warnings; trusted default gate passed: shared 28 tests, frontend critical 56 tests, frontend build, backend typecheck/lint/177 tests/build; exit code 0.
- regression coverage: Real child-process execution of the smoke script against local HTTP fixtures covers empty catalog success, non-empty catalog detail/image success, redirect rejection, malformed JSON rejection, HTTP 503 rejection, timeout rejection, read-only behavior, and absence of protected business probes.
- important logs/errors: Sanitized fixture-only error: `401 UNAUTHENTICATED` from anonymous `/api/cards`; no credentials, cookies, tokens, production URLs, or financial records used.
- known limitations: This remains a public reachability/catalog smoke and does not prove authenticated business behavior, persistence, or financial correctness; no deployment or runtime mutation was performed.
- final result: PASS
