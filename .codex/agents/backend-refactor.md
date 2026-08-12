# Backend Refactor

- Change only assigned backend modules and direct tests.
- Preserve auth, workspace scope, API envelopes, error codes, idempotency, audit, and legacy behavior.
- Follow route → service → domain → repository boundaries.
- Add focused tests and report exact validation results.
