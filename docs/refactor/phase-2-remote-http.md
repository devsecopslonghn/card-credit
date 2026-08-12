# Phase 2 — Remote MCP HTTP

## Deployment

```text
OpenClaw OCI -> HTTPS /mcp -> Ingress -> card-credit-backend -> MongoDB Atlas
```

The backend image serves MCP at `/mcp`; no extra process or port is used. The
Helm ingress routes `/mcp` directly to `card-credit-backend`.

## Runtime secret

The existing `card-credit-runtime` Secret must contain:

- `MCP_HTTP_TOKEN`
- `MCP_USER_ID`
- `MCP_WORKSPACE_ID`
- `MCP_PREVIEW_SECRET`

Do not commit these values or put them in Helm values.

## Verification

1. Build and publish the backend image.
2. Update the Helm image tag through GitOps.
3. Verify `/health` and `/ready`.
4. Verify `/mcp` rejects missing/invalid bearer tokens.
5. Configure OpenClaw with `https://<domain>/mcp` and the bearer token.
6. Test read-only tools before preview/confirm mutations.
