# Finance source of truth

`Account` and `FinancialTransaction` are the only source for balances, spending, receivables and repayments.

`CardStatement` remains the source for statement lifecycle (`OPEN`, `STATEMENT_CLOSED`, `PAID`) and is referenced by financial transactions. `CardTransaction` is legacy/audit input only and must not feed MCP, finance reports or account balances.

Legacy reconciliation is explicit and idempotent. Text such as `Done` in a note is a manual-review candidate, never an automatic reimbursement state.
