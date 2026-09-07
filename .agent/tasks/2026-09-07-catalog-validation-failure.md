# Task: catalog validation failure handling

- task: Ensure malformed or missing required catalog JSON fails validation rather than silently passing.
- status: completed
- scope: `frontend/scripts/validate-card-catalog.mjs`, catalog validation helper and tests.
- plan: isolate file loading, preserve optional manifest fallback, add temporary-file failure tests, run the default gate.
- completed work: Added fail-closed required catalog JSON loading while retaining optional manifest fallback; added malformed/missing input regression tests.
- verification: `npm --prefix frontend run test:critical` passed with 47 tests; `.agent/gates/verify.sh` exited 0 with shared 28 tests, frontend 47 critical tests, backend 177 tests, typechecks, lint and builds passing.
- blocker: none
- next action: none.
