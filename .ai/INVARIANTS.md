# Important invariants

- Every private read and mutation is scoped to the authenticated workspace.
- Credit purchases increase credit debt; statement payment reduces debt and
  debit cashflow but does not create another expense.
- Financial mutations use preview/confirm where required, command-guard
  idempotency, atomic persistence and append-only audit; previews are read-only.
- Never hard-delete financial history or expose secrets/raw reset or calendar
  tokens.
- REST and MCP must call the same application services; do not create parallel
  business logic in adapters.
