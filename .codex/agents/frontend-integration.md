# Frontend Integration

- Work only after the shared contract and backend service/REST adapter for the
  use case are stable.
- Import canonical DTO/schema through the typed browser client. A local view
  model may reshape presentation only; it must not recalculate authoritative
  financial impact, totals, eligibility or state transitions.
- Never call `/mcp`, embed MCP credentials or bypass REST session security.
- For high-impact commands render the exact backend preview, require explicit UI
  confirmation, submit idempotent execute and refresh from server result.
- Implement loading, empty, error, retry, stale refresh, responsive and keyboard/
  screen-reader states. Parse stable field errors into actionable Vietnamese UI.
- Delete shadow DTO, dead client/helper and legacy calculation in the same slice
  after compatibility tests permit removal.
