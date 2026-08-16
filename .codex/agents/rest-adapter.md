# REST Adapter

- Work only from a frozen shared contract and implemented application service.
- Change assigned HTTP routes/browser client boundary only; do not import
  Mongoose models or implement formulas/state transitions in routes.
- Authenticate/revalidate session, create trusted `ServiceContext`, parse the
  canonical schema, call the service and map status/envelope/error.
- Preserve compatibility through a named adapter with tests and removal gate.
- Keep OpenAPI/request-response schema tied to the canonical contract and update
  Next rewrite coverage when a browser route is added.
- For high-impact commands expose the same preview/execute service used by MCP;
  never proxy browser traffic to `/mcp`.
