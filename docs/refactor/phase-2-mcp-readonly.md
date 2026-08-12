# Phase 2 — MCP Read-only MVP

## Goal

Expose safe financial read tools to OpenClaw with Codex through remote
Streamable HTTP.

## Scope

- Fixed server-configured user/workspace.
- No login or multi-user access.
- No stdio fallback; HTTP is the single MCP transport.
- Tools: `get_statement_summary`, `list_transactions`, `compare_cards`, and
  optionally `list_upcoming_statements`.

## Steps

1. Add the minimal MCP SDK/configuration.
2. Create `backend/src/mcp` context, HTTP transport, and tools.
3. Validate tool input and call Phase 1 services.
4. Add HTTP, DTO, scope, limit, and error tests.

## Done when

- AI cannot choose `workspaceId` or `userId`.
- No raw model, query, secret, or unbounded result is exposed.
- OpenClaw/Codex can invoke all MVP tools over HTTPS.

## Implemented

- `backend/src/mcp/http.ts` uses the official Streamable HTTP transport.
- Fixed context uses `MCP_USER_ID` and `MCP_WORKSPACE_ID`.
- Read tools are backed by `StatementService`, `TransactionService`, and
  `CardService`.
- Output is JSON text and no tool accepts tenant identity.
