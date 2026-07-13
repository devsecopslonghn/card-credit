# Dashboard Statement Batch Route Recovery

## Goal and phase

Restore the `/cards` dashboard batch statement request without changing the
existing statement API contract or the card-detail flow. This is one scoped
production bug-fix phase; no statement optimization or unrelated deployment
work is included.

## Root cause

The backend batch implementation already exists at `GET /api/card-statements`
inside `registerTransactionRoutes`, and production bootstrap calls that
installer. It authenticates from the signed session, scopes cards, statements,
and transactions to `session.workspaceId`, uses the same `statementJson` helper
as `GET /api/cards/:id/statements`, and performs one query for each collection.

The frontend started calling the batch endpoint in commit `f6bd27b`, but
`frontend/next.config.ts` did not add the corresponding same-origin rewrite.
Therefore requests through the public Next.js service terminated at its 404
page instead of reaching Fastify. The card-detail endpoint continued to work
because `/api/cards/:path*` was already proxied.

An unauthenticated production request on 2026-07-13 confirmed a Next.js HTML
404 (`x-nextjs-cache`/`x-powered-by` headers), rather than the backend JSON 401
that a registered authenticated route returns. No production cookie or secret
was used.

## Decisions and contract

- Add the exact `/api/card-statements` rewrite; do not add an N+1 per-card
  fallback.
- Preserve `{ data: CardStatementView[] }`, ordering, effective payment status,
  summary serialization, workspace isolation, and all existing detail routes.
- Include each statement's already batch-loaded serialized `transactions`
  array, without adding queries, so the response satisfies the complete
  `CardStatementView` contract.
- When statement loading fails, retain the independently loaded card list and
  warning/retry action, clear statement state, show statement-derived card
  amounts as `--`, and derive no upcoming-payment quick actions from invalid
  data.
- The production Compose/Jenkins path builds both images from the repository
  root with the same `DOCKER_TAG`, but it exposes no build-info endpoint, image
  label, commit SHA, digest, or Jenkins build number through HTTP. The observed
  response proves the missing frontend proxy rule; it does not prove different
  frontend/backend revisions.

## Changed files

- `frontend/next.config.ts`: register the missing batch endpoint rewrite.
- `backend/src/transaction-routes.ts`: include grouped serialized transactions
  in the batch response while retaining the shared statement serializer.
- `backend/tests/transactions.test.ts`: assert transaction attachment and
  effective status in addition to workspace filters and fixed query counts.
- `frontend/app/cards/page.tsx`: pass statement availability to card summaries.
- `frontend/components/cards/CardList.tsx`, `ProviderSection.tsx`,
  `CardItem.tsx`: show unavailable statement-derived amounts as `--`.
- `frontend/tests/dashboardLoad.test.mjs`: cover the proxy registration and
  failure-state/retry wiring.
- `docs/README.md` and this plan: record the active phase and findings.

## Validation status

- `cd shared && npm run validate`: passed (build and 1 test file).
- `cd backend && npm run validate`: passed (typecheck, lint, 15 test files,
  and build). Existing transaction tests cover unauthenticated access, workspace
  filters, multi-card results, transaction grouping, summary/effective status
  serialization, parity through the shared helper, and fixed query counts.
- After adding the response transaction array, backend typecheck, lint, focused
  transaction test, build, and the full 15-file test suite passed again.
- `cd frontend && npm run typecheck && npm run lint && npm test`: passed
  (9 unit files and 1 integration file). Coverage includes independent card/
  statement outcomes, stale-statement clearing, retry wiring, unavailable
  amounts, batch proxy registration, and existing quick-action/detail wiring.
- `cd frontend && npm run build`: passed on the approved networked rerun. The
  first sandboxed run reached the build step but failed only because Google
  Fonts was unreachable. The pre-existing middleware deprecation warning
  remains.
- Built backend runtime smoke: direct `GET /api/card-statements`, proxied
  `GET /api/card-statements`, and proxied per-card statement list all returned
  the expected JSON 401 without a session. This proves the built route is
  registered and the Next rewrite reaches it; no production database was used.
- `git diff --check`: passed. Status/stat and full diff were reviewed.

## Deployment and remaining risk

Local implementation phase status: complete. Deployment verification is an
operational follow-up and has not been represented as completed.

Both frontend and backend images must be rebuilt/redeployed from the same
revision: the 404 fix is compiled into the frontend Next config, and the backend
image contains the completed batch response contract. After deployment, an
unauthenticated request should return backend JSON 401 instead of Next HTML 404,
and an authenticated request must return 200 with `data`.

Production container digests, image revisions, startup logs, Jenkins build
number, authenticated data consistency, and browser behavior remain to be
verified in the deployment environment. Never record the session cookie.

An authenticated local 200 smoke was skipped because no safe isolated MongoDB
session fixture was already running; the deliberately unreachable local smoke
URI was used only to prove pre-database auth routing. Production deployment and
authenticated browser/curl verification remain required. No E2E, migration,
seed, destructive database operation, real SMTP, or production database access
was performed.
