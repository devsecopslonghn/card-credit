# AGENTS.md

## Before changing code

- Read README.md and any file under docs/plans/active/.
- Check the current branch with `git branch --show-current`.
- Review `git status` and the existing diff before editing.
- Do not overwrite unrelated user changes.

## Scope

- Only change files required by the current task.
- Do not change business logic unless explicitly requested.
- Preserve existing API contracts and user-visible behavior.
- Prefer small, reviewable changes.

## Git safety

- Do not commit, push, merge, rebase, or force-push unless explicitly requested.
- Do not switch branches unless explicitly requested.
- Do not rewrite repository history.
- Do not delete user changes.

## Data and security

- Never use a production database for tests, seed data, migrations, or E2E.
- Do not run destructive database operations.
- Do not commit or print secrets, tokens, passwords, or connection strings.
- Do not place server-only secrets in frontend code.

## Validation

- Inspect package scripts before choosing validation commands.
- Run relevant lint, typecheck, test, and build commands.
- Run `git diff --check`.
- Do not report a command as passed unless it was actually executed.
- Clearly separate existing failures from failures introduced by the task.

## Long-running tasks

- Use files under `docs/plans/active/` for task-specific progress.
- Complete only one phase per iteration when a phased plan exists.
- Update the active plan before stopping.
- After context compaction, reread this file, the active plan, `git status`, and the diff.

## Project references

- README.md
- docs/domain-model.md
- docs/current-behavior.md
- docs/catalog-snapshot-policy.md
- docs/release-plan.md
- docs/card-catalog-roadmap.md