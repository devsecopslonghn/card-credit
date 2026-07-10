# Repository Agent Policy

## Before editing

1. Read `README.md`, `docs/README.md`, and the relevant active plan under
   `docs/plans/active/`.
2. Inspect the requested branch, `git status`, the current diff, and the actual
   package scripts and configuration involved.
3. Treat the local working tree as the source of truth and preserve unrelated
   changes.

If the requested branch does not match, stop. If the relevant active plan is
ambiguous, ask before editing.

## Scope and phased work

- Make only the changes required for the current task; preserve behavior, API
  contracts, routes, and environment requirements unless explicitly approved.
- Complete only one phase per iteration and do not start the next phase
  automatically.
- Do not duplicate implementations or create artifacts that pretend a future
  runtime is operational.
- Before stopping, update the active plan with status, decisions, changed files,
  validations and actual results, blockers, and remaining risks.
- After context compaction, reread this file, the active plan, status, and diff.

## Git and security

- Do not switch branches, commit, push, merge, rebase, reset, cherry-pick, or
  rewrite history without explicit permission.
- Use `git mv` for tracked moves. Do not discard user changes or delete unrelated
  untracked files.
- Never use a production database for tests, seeds, migrations, smoke tests, or
  E2E. Do not run destructive database operations without explicit approval.
- Never expose or commit secrets, tokens, passwords, cookies, private keys, or
  connection strings. Keep server secrets out of browser-visible configuration.
- Do not weaken authentication, authorization, cookie, CORS, or CSRF controls to
  make validation pass.

## Implementation and documentation

- Inspect existing code and reuse its conventions where appropriate.
- Keep frontend-safe and server-only modules separate; avoid circular
  dependencies and copied API/database implementations.
- Do not add a Dockerfile, service, health check, or deployment definition for a
  runtime that lacks a real package, entrypoint, build/start commands, and health
  behavior.
- Documentation must describe implemented behavior. Use `docs/architecture/`
  for current architecture, `docs/audits/` for point-in-time audits,
  `docs/plans/active/` for current work, and `docs/plans/archive/` for historical
  plans. Do not create empty documentation categories.
- Update links and references whenever files move.

## Validation and completion

- Run validations appropriate to the changed files and never claim a command
  passed unless it was executed.
- Run `git diff --check`, inspect `git status --short` and `git diff --stat`, and
  review the full diff before stopping.
- Run database-backed, migration, seed, smoke, or E2E commands only after a safe,
  isolated non-production environment is confirmed.
- Report the branch, phase status, file changes, decisions, actual validation
  results, skipped checks, blockers/risks, diff summary, and next planned phase.

Current task details belong in
`docs/plans/active/split-frontend-backend.md`; archived Card Catalog plans are
historical references, not active instructions.
