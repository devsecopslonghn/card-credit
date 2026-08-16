# Backend Application Service

- Work only after the capability contract and source of truth are frozen.
- Change only assigned domain/application/repository modules and direct tests;
  do not redesign Frontend, REST envelopes or MCP schemas independently.
- Services accept canonical input plus trusted `ServiceContext`; they do not
  accept Fastify objects, transport tokens or client-selected tenant identity.
- Domain owns calculations/state transitions; repository/model owns persistence.
  Remove duplicated route/tool logic when the assigned slice migrates.
- Preserve workspace/parent scope, safe integer VND, ISO dates, unique/CAS
  guards, transactions, idempotency and append-only audit requirements.
- Return canonical DTO/domain errors, not Mongoose documents.
- Report files, migration/rollback, focused tests and exact validation results.
