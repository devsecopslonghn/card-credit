# REAL_MONEY account merge dry-run

This runbook is read-only. It does not authorize a production write,
migration, deployment, or confirmation.

## Preview

Use an authenticated workspace context and exact IDs from `list_accounts`:

```json
{
  "sourceAccountIds": ["<cash-account-id>"],
  "targetAccountId": "<vietcombank-account-id>",
  "keepTargetAsCash": false,
  "expectedVersion": 3
}
```

Call `preview_merge_accounts` or `POST /api/accounts/merge/preview`. Verify
same workspace/currency, REAL_MONEY-only accounts, balance totals, transaction
count, and warnings. Do not call confirm during a dry-run.

## New cash target

```json
{
  "sourceAccountIds": ["<cash-account-id>", "<vietcombank-account-id>"],
  "targetName": "Tiền mặt hợp nhất",
  "targetType": "CASH",
  "keepTargetAsCash": true
}
```

The target is created only inside the confirm transaction. A failure rolls back
target creation, transaction moves, archive changes, receipt, and audit. A real
confirm requires explicit human approval, the unchanged preview payload,
preview ID/token, and a new `Idempotency-Key`.
