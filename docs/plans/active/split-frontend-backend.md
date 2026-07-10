# Split Frontend and Backend

## Goal

Split the current Next.js monolith into:

- `frontend/`: Next.js UI
- `backend/`: standalone API runtime

## Current State

- Next.js application has been moved into `frontend/`.
- API routes remain under `frontend/app/api/**`.
- Docker Compose currently runs one application container.
- Standalone backend runtime does not exist yet.

## Constraints

- Preserve existing routes and behavior.
- Do not use production MongoDB for testing.
- Do not duplicate API implementations.
- Do not commit or push unless requested.

## Phase Status

| Phase | Status |
|---|---|
| Phase 0 — Repository audit | DONE |
| Phase 1 — Repository layout | IN_PROGRESS |
| Phase 2 — Backend design | TODO |
| Phase 3 — Backend runtime | TODO |
| Phase 4 — API migration | TODO |
| Phase 5 — Docker and Jenkins | TODO |
| Phase 6 — E2E and cleanup | TODO |

## Current Phase

### Phase 1 — Repository layout

Acceptance criteria:

- [x] Application lives under `frontend/`
- [x] `backend/` exists
- [ ] Frontend Dockerfile is consistent
- [ ] Compose uses the correct Dockerfile
- [ ] Jenkins paths are consistent
- [ ] Documentation matches the actual layout
- [ ] Validation passes

## Validation

```bash
git diff --check
cd frontend
npm run typecheck
npm run lint
npm run test:unit
npm run build