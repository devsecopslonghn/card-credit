# Evidence: catalog manifest image fallback regression

- task ID: 2026-09-07-catalog-regression
- diff/commit: working tree diff (no commit created)
- commands executed: `./.agent/gates/verify.sh`
- exit results: 0
- tests/build summary: shared validate passed (28 tests); frontend typecheck, lint, critical tests (45 passed), and production build passed; backend validate passed (typecheck, lint, critical tests with 177 passed, production build).
- unresolved limitations: end-to-end browser and deployment smoke tests are not part of the default gate.
- final result: PASS
