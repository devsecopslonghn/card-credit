# card-credit working agreement

## Purpose

Modular financial backend and MCP connector. REST, MCP and jobs call the same
application services; `shared/` owns runtime contracts and DTOs.

The system has three packages: `shared/` contains framework-free contracts,
`backend/` contains Fastify, Mongo persistence, domain services, REST and MCP,
and `frontend/` contains the Next.js UI, browser clients and static assets.

## Commands

- `cd shared && npm ci && npm test && npm run typecheck`
- `cd backend && npm ci --include=optional && npm run lint && npm run typecheck && npm test`
- `cd frontend && npm ci --include=optional && npm run typecheck && npm run lint && npm test && npm run build`
- Use `npm run test:all` only for the extended suite when available.

The reusable default gate is `.agent/gates/verify.sh`; use
`.agent/gates/verify.sh full` for package-wide tests.

## Session bootstrap

At the start of every coding session, read `AGENTS.md` and `.agent/STATE.md`,
classify the task, load only its relevant workflow from `.agent/workflows/` and
the relevant `.ai/` context/invariants, inspect only the affected repository
areas, create or update a task record from `.agent/templates/task.md`, then
execute that workflow and record evidence from `.agent/templates/evidence.md`.

## Safety

- Read repository state and scoped data before changes; never write production,
  confirm MCP repairs, or deploy from a coding task.
- Financial repairs are preview -> explicit human confirmation -> atomic,
  idempotent command -> audit. Preview is read-only and must not create ledger
  transactions.
- Do not hard-delete financial history. Preserve workspace scoping, IDs and
  foreign-key references.

## Important locations

- `shared/src/*-contracts.js`: canonical schemas and MCP/API contracts.
- `backend/src/services/`: application/domain orchestration.
- `backend/src/models/`: Mongo persistence models.
- `backend/src/mcp/`: manifest and thin MCP adapters.
- `backend/tests/` and `shared/tests/`: regression and contract evidence.

## Done

A change is done only when the relevant existing tests, typecheck, lint and
build checks pass, or a concrete blocker is recorded in `.agent/STATE.md` and
the task record. Keep task evidence under `.agent/evidence/`.
