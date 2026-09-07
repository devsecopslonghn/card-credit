# System map

- `shared/`: canonical Zod/runtime contracts and DTOs; no database or transport.
- `backend/`: Node 22 Fastify application. Routes and MCP adapters delegate to
  services; services enforce domain rules and workspace scope; models persist to
  MongoDB.
- `frontend/`: Next.js 16/React 19 UI and browser API clients. Browser requests
  use relative `/api/**`, rewritten to the backend by Next.
- `frontend/data/card-presets.json`: catalog baseline. It is validated and
  imported explicitly; it is not runtime mutable storage.

## Flow and boundaries

HTTP/MCP -> route/adapter -> backend service/domain -> repository/model -> MongoDB.
Shared contracts are the boundary between backend and frontend. Keep financial
calculations in backend services/domain code, not route handlers or UI clients.
