# Backend Placeholder

`backend/` is reserved for Phase 2 of the frontend/backend split.

Production backend runtime does not run from this directory yet. Current API routes still run inside the Next.js app at:

```text
frontend/app/api/**
```

This Phase 1 layout change must not be interpreted as a completed backend extraction. No source code is copied or duplicated into this directory.

`backend/Dockerfile` is a placeholder too. It is not referenced by production Docker Compose or Jenkins deploy stages and must not be treated as a backend service image.

Expected Phase 2 scope, after a concrete design is approved:

- `frontend/app/api/**`
- `frontend/models/**`
- `frontend/lib/api/**`
- `frontend/lib/auth/**`
- `frontend/lib/catalog/**`
- `frontend/lib/services/**`
- `frontend/lib/reports/**`
- `frontend/lib/observability/**`
- `frontend/lib/mongodb.ts`
- related server-side scripts
- related integration tests
