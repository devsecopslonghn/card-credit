# Finance source of truth

`Account` and `FinancialTransaction` are the only source for balances, spending, receivables and repayments.

`CardStatement` remains the source for statement lifecycle (`OPEN`, `STATEMENT_CLOSED`, `PAID`) and is referenced by financial transactions. The former `CardTransaction` collection has been migrated and removed.

Debt reporting is statement-based and keeps paid history. `grossDebt` is the
statement charge total, `paidDebt` is the settled amount, and `outstandingDebt`
is the remaining payable amount. The latter is a payment/reminder projection,
not a replacement for the full debt ledger.

Legacy reconciliation is explicit and idempotent. Text such as `Done` in a note is a manual-review candidate, never an automatic reimbursement state.
