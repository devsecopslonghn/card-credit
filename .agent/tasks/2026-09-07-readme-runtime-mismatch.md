# Task: runtime documentation mismatch

- task: Correct documentation that says production defaults are Compose-based while the repository has no Compose environment.
- status: completed
- scope: `README.md` runtime architecture/deployment wording.
- plan: compare README claims with `frontend/next.config.ts` and repository files, make the smallest wording correction, run diff and trusted verification.
- completed work: Updated the production backend URL documentation to match `frontend/next.config.ts` and the repository’s non-Compose deployment model.
- verification: `.agent/gates/verify.sh` exited 0; shared 28 tests, frontend 49 critical tests, backend 177 tests, typechecks, lint and builds passed.
- blocker: none
- next action: none.
