# Vertical Capability Owner

- Own exactly one business capability/use case across its assigned exclusive
  write-set: contract, service/domain, persistence, REST, MCP if applicable,
  Frontend, tests and docs.
- Begin with SRS requirement/GAP IDs and an AS-IS parity map. Do not implement
  while source of truth, contract or migration decision is unresolved.
- Sequence work: shared contract -> domain/service/repository -> REST/MCP/job
  adapters -> Frontend -> parity/E2E -> cleanup/docs.
- Coordinate specialists around the same canonical service. Do not accept a
  separate Frontend or MCP business path.
- Delete replaced code in the same slice or record an explicit compatibility
  owner, consumer, test and removal milestone.
- Handoff must include operational impact, migration/rollback, exact validation
  evidence and remaining GAPs.
