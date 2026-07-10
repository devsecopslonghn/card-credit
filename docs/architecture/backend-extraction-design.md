# Backend Extraction Design

## Decision summary

Use a TypeScript Fastify service on Node.js 22 with Mongoose. Preserve the
browser-visible `/api/**` contract by having Next.js rewrite `/api/**` to the
backend. Production remains same-origin; browsers never need a backend URL or
CORS. Development may use the same rewrite with `BACKEND_INTERNAL_URL`.

Fastify was selected over Express (larger ecosystem but less structured
validation/logging) and NestJS (strong structure but disproportionate migration
and decorator overhead). Fastify provides lifecycle hooks, schema validation,
Pino logging, and low-overhead adapters while allowing the existing core
services to move incrementally.

## Route inventory

Auth values are `public`, `session`, or `admin`. All database routes use
`MONGODB_URI`; all session routes use `AUTH_SECRET`. Catalog routes use the
MongoDB Card Product repository. Group order is Public, Auth, Domain, Admin.

| Route | Methods | Auth | Models / dependencies | Next.js coupling | Risk | Group |
|---|---|---|---|---|---|---|
| `/api/card-catalog/providers` | GET | public | MongoDB CardProduct | none | low | Public |
| `/api/card-catalog/products` | GET | public | MongoDB CardProduct | none | low | Public |
| `/api/card-catalog/products/:presetId` | GET | public | MongoDB CardProduct | none | low | Public |
| `/api/auth/login` | POST | public | User, AuthAuditLog, password/session | cookies, `NextResponse` | high | Auth |
| `/api/auth/logout` | POST | session | AuthAuditLog, session | cookies, `NextResponse` | high | Auth |
| `/api/auth/me` | GET | session | session | `NextResponse` | high | Auth |
| `/api/auth/register` | POST | public | User, AuthAuditLog, password/session | cookies, `NextResponse` | high | Auth |
| `/api/auth/forgot-password` | POST | public | User, PasswordResetToken, AuthAuditLog | request URL, `NextResponse` | high | Auth |
| `/api/auth/reset-password` | POST | public | User, PasswordResetToken, AuthAuditLog | cookies, `NextResponse` | high | Auth |
| `/api/auth/bootstrap-users` | POST | token | User, AuthAuditLog, configured users | headers, `NextResponse` | high | Auth |
| `/api/cards` | GET, POST | session | CreditCard, catalog/card service | `NextResponse` | medium | Domain |
| `/api/cards/:id` | GET, PUT, DELETE | session | CreditCard/card service | params, `NextResponse` | medium | Domain |
| `/api/cards/duplicates` | GET, POST | session | CreditCard/deduplication | URL, `NextResponse` | medium | Domain |
| `/api/card-transactions` | GET, POST | session | CreditCard, CardStatement, CardTransaction | URL, `NextResponse` | high | Domain |
| `/api/card-transactions/:id` | PATCH, DELETE | session | CreditCard, CardStatement, CardTransaction | params, `NextResponse` | high | Domain |
| `/api/card-transactions/:id/cashback` | PATCH | session | CreditCard, CardStatement, CardTransaction | params, `NextResponse` | high | Domain |
| `/api/cards/:id/statements` | GET | session | CreditCard, CardStatement, CardTransaction | params/URL, `NextResponse` | high | Domain |
| `/api/cards/:id/statements/:statementId` | GET | session | CreditCard, CardStatement, CardTransaction | params, `NextResponse` | high | Domain |
| `/api/cards/:id/statements/:statementId/payment` | PATCH | session | CreditCard, CardStatement, CardTransaction | params, `NextResponse` | high | Domain |
| `/api/notes` | GET, POST | session | CalendarNote | inline `NextResponse` | medium | Domain |
| `/api/reports/summary` | GET | session | CreditCard, CalendarNote, statements/transactions | URL, `NextResponse` | medium | Domain |
| `/api/profile` | GET, PATCH | session | User | `NextResponse` | medium | Domain |
| `/api/banks` | GET, POST | session/admin-write | Bank | inline `NextResponse` | medium | Admin |
| `/api/banks/:id` | PUT, DELETE | admin | Bank | params, `NextResponse` | medium | Admin |
| `/api/cardtypes` | GET, POST | session/admin-write | CardType | inline `NextResponse` | medium | Admin |
| `/api/cardtypes/:id` | PUT, DELETE | admin | CardType | params, `NextResponse` | medium | Admin |
| `/api/admin/users` | GET | admin | User | `NextResponse` | high | Admin |
| `/api/admin/users/:id` | PATCH | admin | User | params, `NextResponse` | high | Admin |
| `/api/admin/audit-logs` | GET | admin | AuthAuditLog | URL, `NextResponse` | medium | Admin |
| `/api/admin/card-catalog/products` | GET, POST | admin | MongoDB CardProduct | none | high | Admin |
| `/api/admin/card-catalog/products/:presetId` | PATCH | admin | MongoDB CardProduct | none | high | Admin |
| `/api/admin/card-catalog/providers/:providerCode` | PATCH | admin | MongoDB CardProduct | none | high | Admin |

## Dependency and boundary map

`route adapter -> request/session validation -> API core -> domain service ->
Mongoose model -> MongoDB`. Catalog APIs additionally depend on catalog storage;
audit-producing APIs depend on AuthAuditLog. Next.js response and cookie APIs are
currently mixed into API cores and must be replaced by transport-neutral results.

- Frontend-only: React components, App Router pages, middleware UI redirects,
  browser API clients, image/UI helpers.
- Server-only: environment, MongoDB lifecycle, Mongoose models, password hashing,
  session signing, catalog writes, audit logging, route adapters.
- Client-safe shared: DTOs, error envelope, catalog/card enums, request/response
  contracts, pure formatting/validation without environment or database imports.

The shared boundary will be a small workspace package only after imports prove a
real consumer on both sides. Database documents are never shared DTOs.

## Runtime contract

- Backend listens on `BACKEND_PORT` (default `3001`) and binds `0.0.0.0`.
- `GET /health` reports process liveness without dependencies or secrets.
- `GET /ready` returns 200 only after MongoDB is connected, otherwise 503.
- Startup validates `MONGODB_URI`, `AUTH_SECRET` (minimum 32 characters), port,
  and optional bootstrap/reset settings before listening.
- JSON logs contain timestamp, level, event/request id, method, path, status and
  duration; sensitive headers, cookies, tokens, passwords, and database URIs are
  redacted. Errors retain the existing `{ error: { code, message, fields? } }`
  envelope and avoid stack traces in production responses.
- One cached Mongoose connection is opened during startup. SIGTERM/SIGINT stop
  accepting traffic, close HTTP, then disconnect MongoDB with a bounded timeout.

## URL and deployment topology

- Browser: relative `/api/**` only.
- Next.js server: rewrites `/api/:path*` to
  `${BACKEND_INTERNAL_URL}/api/:path*`; health endpoints are not public API.
- Local: frontend `3000`, backend `3001`, developer-owned non-production MongoDB.
- Compose: frontend internal `3000`, backend internal `3001`; only frontend is
  published. Frontend reaches `http://backend:3001`.
- Production: the same Compose topology behind the existing frontend origin.

## Authentication and browser security

The backend owns login, logout, registration, reset, bootstrap, session signing,
and authorization. The existing `card_credit_session` remains HttpOnly, Secure,
SameSite=Lax, Path=/ and host-only by default. Because browser requests remain
same-origin, CORS is disabled in production and no credentialed wildcard is
allowed. State-changing requests must pass same-origin Origin/Host validation;
SameSite is defense in depth. Logout clears the same cookie attributes. Reset
tokens remain hashed at rest. Bootstrap remains disabled without both a server
token and explicit user input. No MongoDB or auth secret is available to Next.js
after migration.

## Migration and rollback

1. Add the backend runtime and transport-neutral shared contracts.
2. Migrate public catalog routes and validate rewrite compatibility.
3. Migrate authentication as one security boundary.
4. Migrate card/transaction/report/profile routes by dependency group.
5. Migrate admin/master-data/catalog-write routes.
6. Remove each Next.js implementation after its backend contract tests pass.

Each group is rollback-safe by reverting its rewrite/adapter commit while the
database schema and public contract remain unchanged. Do not dual-write or run
permanent duplicate implementations. Deployment rollback uses the previous pair
of image tags.

## Risks and resolved decisions

- Cookie behavior through rewrites is high risk: validate Set-Cookie and logout
  end-to-end before removing Next.js auth routes.
- MongoDB is the single mutable Card Catalog authority. Repository JSON is a
  read-only baseline and is imported only through an explicit operator command.
- Middleware currently checks only cookie presence; backend authorization remains
  authoritative and middleware becomes UI convenience only.
- Initial catalog population is an explicit, guarded, idempotent baseline import;
  startup never performs an implicit migration.
