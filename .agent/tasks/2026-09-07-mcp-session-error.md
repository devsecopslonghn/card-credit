# Task: stabilize MCP missing-session errors

- task ID: 2026-09-07-mcp-session-error
- type: fix
- risk: R2
- status: completed
- symptom/goal: An authenticated MCP request without a valid session can enter the 400 path after `reply.hijack()`, leaving the HTTP response unresolved instead of returning the documented session error.
- scope: backend/src/mcp/http.ts; backend/tests/mcp-inventory.test.ts; task evidence and state.
- relevant invariants: MCP bearer authorization remains required; requests without a usable MCP session return a deterministic 400 `MCP_SESSION_REQUIRED`; valid initialize/session traffic remains unchanged.
- plan: Reproduce the missing-session behavior with Fastify injection, move hijacking after the no-transport guard, add a regression assertion for the 400 response, run focused MCP tests and the trusted default gate, record evidence and push.
- work completed: Moved `reply.hijack()` after the no-transport guard and added an HTTP regression assertion for the deterministic 400 session error.
- verification: Focused MCP suite passed 16/16; `.agent/gates/verify.sh` passed with exit code 0.
- blocker: none
- next action: none
