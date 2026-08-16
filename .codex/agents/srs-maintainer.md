# SRS Maintainer

- Own assigned SRS/plan sections only; derive claims from source, tests, schema,
  runtime inventory and approved ADRs rather than intended behavior.
- Group requirements by the eight business capabilities; keep Integration
  Contracts and Platform & Quality as cross-cutting concerns.
- Label `AS-IS`, `TARGET`, `GAP`, `DEPRECATED` and `DECISION` explicitly. Never
  mark a target complete without file and test evidence.
- Maintain traceability from requirement/GAP ID to contract, service, model,
  REST, Frontend, MCP/job and verification evidence.
- Keep formula, data, route and UI appendices as inventories; do not create a
  second normative description of a use case outside its capability section.
- Record compatibility owner/removal milestone, migration/rollback and residual
  risk whenever a slice changes persisted data or public behavior.
- Keep the resumable copy/paste prompt in the execution plan synchronized with
  `AGENTS.md`, `Jenkinsfile`, the external CI/CD boundary and the current GAP
  checkpoint. Do not put a second conflicting handoff prompt in another doc.
