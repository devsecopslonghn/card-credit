# Evidence: smoke fixture timing

- task ID: 2026-09-07-smoke-fixture-timeout
- relevant Git diff/commit: `f4e807f test: stabilize smoke fixture timeout`; `frontend/tests/smokeBoundary.test.mjs` plus task/state evidence.
- root cause or implementation claim: The fixture defaulted `SMOKE_REQUEST_TIMEOUT_MS` to 50ms, which is shorter than child-process startup variability on CI; the reported empty-catalog case aborted before `/login` completed. The default is now 1000ms, while the dedicated timeout subtest overrides it to 50ms.
- commands/checks executed: `for i in $(seq 1 10); do node --test tests/smokeBoundary.test.mjs; done` equivalent loop from `frontend`; `git diff --check`; `./.agent/gates/verify.sh` from repository root.
- exit/result summary: 10 consecutive focused runs passed 9/9 tests; trusted default gate passed: shared 28 tests, frontend critical 56 tests/build, backend typecheck/lint/177 tests/build; exit code 0.
- regression coverage: Empty-catalog and non-empty-catalog success fixtures run with the safe default timeout; redirect, malformed JSON, HTTP 503 and timeout failures remain covered.
- important logs/errors: Sanitized pre-fix CI symptom: `[smoke] FAIL public login request failed / This operation was aborted`; no credentials or runtime data involved.
- known limitations: This proves local fixture determinism only; no deployed smoke was run.
- final result: PASS
