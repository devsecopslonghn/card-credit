# Card Credit — Agent Rules

## Core principles

- Inspect instructions, git state, relevant code, docs, and tests before editing.
- Make the smallest safe, reversible change; preserve unrelated work.
- Clean the affected code before refactoring: remove dead code, duplicate paths,
  stale helpers, and misleading compatibility logic. Do not leave two sources
  of truth after extraction.
- Do not commit, push, deploy, mutate infrastructure, or trigger CI without explicit request.
- Keep the system as a modular monolith unless a new architecture is approved.
- Preserve API compatibility and existing business behavior unless change is explicit.

## Architecture

- Frontend never accesses MongoDB; backend owns API, auth, authorization, and domain logic.
- Routes handle transport/auth; services orchestrate; domain functions calculate; repositories persist.
- REST, MCP, and jobs reuse the same services; never duplicate business rules.
- Service methods receive validated input plus trusted `ServiceContext`; never accept workspace scope from AI arguments.
- MongoDB is the runtime source of truth.

## Refactor and MCP rules

- Extract existing behavior before redesigning it; keep each slice backward-compatible.
- After moving logic, delete the old implementation in the same slice unless a
  documented compatibility boundary explicitly requires it.
- MCP targets OpenClaw with Codex, starts as local `stdio` and read-only. Expose DTOs, never Mongoose documents or generic database queries.
- MCP uses one server-configured fixed `workspaceId`/`userId`; AI cannot choose tenant scope or switch users.
- Mutations require preview, explicit human confirmation, idempotency, validation, and audit.
- Protect statement uniqueness, payment state transitions, and `actualNetBenefit` with tests, MongoDB transactions where multi-document atomicity is required, and unique/idempotent guards.

## Security and data

- Scope every private read/write by `workspaceId` and validate parent resources.
- Never trust client-provided `userId`, `role`, or `workspaceId`.
- Never expose or log secrets, cookies, passwords, tokens, PAN, CVV, OTP, or MongoDB URIs.
- Preserve financial invariants: safe integer VND, ISO dates, correct statement state machine,
  and separate transaction cashback, bank cashback, fees, and net benefit.
- Mutations must validate input and use idempotency/audit where relevant.

## Refactor workflow

1. State scope, assumptions, affected modules, risks, and rollback.
2. Change one vertical slice at a time.
3. Add focused tests and run the narrowest relevant validation.
4. Update contracts/docs when behavior or boundaries change.

## Handoff

Report outcome, changed files, validation evidence, risks, and next step. Never claim unrun checks passed.

Use `.codex/agents/` for focused analysis or implementation; give each agent only the files it needs.
