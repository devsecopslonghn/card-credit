# Evidence: runtime documentation mismatch

- task ID: 2026-09-07-readme-runtime-mismatch
- diff/commit: working tree diff (no commit created)
- commands executed: `./.agent/gates/verify.sh`; `git diff --check`
- exit results: both exited 0
- tests/build summary: shared, frontend and backend default validation passed; documentation now describes `BACKEND_INTERNAL_URL` override instead of Compose-only behavior.
- unresolved limitations: no live deployment was contacted.
- final result: PASS
