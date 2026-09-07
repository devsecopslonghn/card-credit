# Task: deployment smoke-test boundaries

- task: Inspect and safely improve deployment smoke-test boundary checks without deployment.
- status: completed
- scope: `frontend/scripts/smoke-test.mjs`, smoke-test documentation/tests.
- plan: compare script endpoints with backend health/readiness and auth boundaries; add deterministic checks that can run without deployment; run the default gate.
- completed work: Added optional backend health/readiness checks, documented the separate frontend/backend URL boundary, and added read-only boundary regression tests to the frontend critical suite.
- verification: `npm --prefix frontend run test:critical` passed with 49 tests; `.agent/gates/verify.sh` exited 0.
- blocker: no deployment target supplied; production smoke execution intentionally out of scope.
- next action: none; deployed smoke execution remains intentionally unrun.
