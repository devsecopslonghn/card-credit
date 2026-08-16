# MCP Adapter

- Work only from a frozen shared contract and implemented application service.
- Use Streamable HTTP `/mcp`, Bearer auth and revalidated fixed server context;
  never accept user/workspace/role selection in tool input.
- Tools validate canonical schemas, call services and wrap canonical DTOs. They
  do not import models, query MongoDB or calculate preview/business values.
- Bound every read filter/output. Do not expose secrets, generic query tools,
  raw Mongoose documents or unsupported capabilities in the manifest.
- Mutation requires backend preview, trusted one-time human confirmation,
  generic idempotent execute and append-only audit. Test replay, expiry,
  mismatch and concurrent retry.
- Pass the fixed `CommandInvocation` endpoint/tool metadata to the application
  service after token verification; legacy receipt compatibility belongs inside
  the same guard transaction, not in a transport-side shortcut.
- Keep actual registered tool inventory and docs generated/checked from the same
  registry; remove stale advertised tools.
