# Phase 1 — Service Boundary

## Status

Completed for the transaction read path. Remaining routes are intentionally
deferred to the next Phase 1 slice to keep behavior changes small.

## Goal

Extract existing business logic into backend services without changing REST
contracts or user-visible behavior.

## Scope

Start with statement/transaction read paths and their direct domain helpers.
Add `ServiceContext` and clean DTOs. Keep existing route files and models; do
not rename the whole backend in this phase.

## Steps

1. Add `services/types` with trusted context and DTO types.
2. Extract statement summary/list and transaction list use cases.
3. Adapt REST routes to call services.
4. Add service unit tests and preserve route regression tests.
5. Run backend typecheck, lint, focused tests, and full backend tests.

## Rules

- Clean the affected route before extraction: remove dead/duplicate helpers and
  keep one source of truth. Do not leave old and new implementations active.
- Service does not depend on Fastify request/reply.
- Every private read/write is workspace-scoped and validates parent resources.
- DTOs do not expose Mongoose documents or internal fields.
- No API envelope or business rule changes.

## Done when

- REST routes are adapters for the extracted scope.
- Service tests cover authorization scope and financial mapping.
- `backend npm run validate` passes.
- Security/data/verification review reports no blocking finding.

## Completed slice

- Added `backend/src/services/types/service-context.ts`.
- Added transaction filters/result types.
- Added `TransactionService.list()` for workspace-scoped transaction reads and
  DTO serialization.
- Adapted `GET /api/card-transactions` to call the service.
- Preserved existing route response shape and validation behavior.

## Verification evidence

- Backend typecheck: pass.
- Backend lint: pass.
- Backend tests: 63 pass.
- Backend build: pass.
- `git diff --check`: pass.
