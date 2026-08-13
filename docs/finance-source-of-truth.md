# Finance source of truth

`Account` and `FinancialTransaction` are the only source for balances, spending, receivables and repayments.

`CardStatement` remains the source for statement lifecycle (`OPEN`, `STATEMENT_CLOSED`, `PAID`) and is referenced by financial transactions. The former `CardTransaction` collection has been migrated and removed.

Legacy reconciliation is explicit and idempotent. Text such as `Done` in a note is a manual-review candidate, never an automatic reimbursement state.
