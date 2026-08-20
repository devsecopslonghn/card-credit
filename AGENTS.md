# card-credit working agreement

## Purpose

Modular financial backend and MCP connector. REST, MCP and jobs call the same
application services; `shared/` owns runtime contracts and DTOs.

## Commands

- `cd shared && npm ci && npm test && npm run typecheck`
- `cd backend && npm ci --include=optional && npm run lint && npm run typecheck && npm test`
- Use `npm run test:all` only for the extended suite when available.

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
