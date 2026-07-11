# ADR 0001: Fastify backend behind same-origin Next.js rewrites

- Status: Accepted
- Date: 2026-07-11

## Context

The Next.js runtime currently owns UI, API adapters, authentication, Mongoose
models, and database access. The public `/api/**` contract and secure cookie
behavior must remain stable while API ownership moves to a standalone runtime.

## Decision

Build a TypeScript Fastify service on Node.js 22. Next.js rewrites relative
`/api/**` requests to the internal backend, so production browser traffic remains
same-origin. The backend owns MongoDB, authentication, authorization, cookies,
logging, error mapping, health/readiness, and graceful shutdown.

## Consequences

- Existing browser URLs remain unchanged and production CORS is unnecessary.
- Fastify adapters replace `NextResponse` while pure domain logic is retained.
- Frontend deployment needs only the internal backend URL, never database or auth
  secrets.
- Authentication and rewrite behavior require explicit end-to-end tests.
- Two coordinated images and rollback tags are required after the split.
