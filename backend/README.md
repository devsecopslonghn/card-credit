# Backend

Minimal standalone Fastify runtime for the API extraction. It currently exposes
only `GET /health` and `GET /ready`; business APIs still run under
`frontend/app/api/**` until their migration phase.

```bash
npm ci
MONGODB_URI="mongodb://127.0.0.1/card-credit-development" \
AUTH_SECRET="use-at-least-32-random-characters" \
npm run dev
```

The server listens on port `3001` by default. Readiness becomes healthy after
MongoDB connects. Do not point development or tests at production data. A
production Dockerfile is intentionally deferred to Phase 7.
