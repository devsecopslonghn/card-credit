# Documentation

## Current architecture

- [Architecture](architecture.md): runtime topology, boundaries and deployment.
- [API contract](api.md): auth, card, statement, report and central cash-flow APIs.
- [Database](database.md): persistence, indexes and compatibility policy.
- [UI architecture review](ui-architecture-review.md): Stitch-aligned route and component decisions.
- [Requirements](requirements.md): current product behavior and constraints.
- [Software Requirements Specification](SRS.md): source-derived AS-IS requirements by component, interfaces, data rules, traceability and known gaps.
- [Frontend/MCP/Backend unification plan](frontend-mcp-backend-unification-plan.md): contract-first vertical-slice roadmap with one canonical backend service per capability.
- The copy/paste session handoff prompt is maintained in the unification plan;
  it is the only resumable prompt to use after reading `AGENTS.md` and `SRS.md`.
- CI entry point: repository `Jenkinsfile`; CI behavior: external `ci-platform`;
  CD/GitOps behavior: external `cd-platform`. A repository push proves source
  publication only, not image publication or Kubernetes rollout.

Historical planning files are intentionally not linked here until they are
restored as maintained documents.
