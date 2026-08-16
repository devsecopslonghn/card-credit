# MCP preview writer rollout gate

This runbook is required before deploying an image that writes
`commandpreviews` or `commandreceipts`.

## Preconditions

- Confirm the exact Kubernetes context, namespace, deployment and image digest.
- Confirm the candidate image contains preview claims v2 and the persistent
  `CommandGuardService`; do not run mixed old/new writers.
- Start the candidate with `MCP_WRITER_MODE=read` while validating health and
  tool inventory. Set `MCP_WRITER_MODE=write` only after the old writer is
  fenced and the candidate smoke checks are complete.
- Back up the target workspace with `backend/scripts/backup-finance-workspace.ts`
  and record the mode-600 file path in the execution plan.
- Run `npm run ensure:command-guard-indexes` with
  `COMMAND_GUARD_INDEX_APPLY=false`; duplicate receipt/preview groups must be
  zero.

## Fence sequence

1. Stop ingress/traffic to the old MCP writer or scale the old backend
   deployment to zero only after the candidate deployment is ready to accept
   the same REST health/readiness checks.
2. Verify no old pod remains Ready and no old image is serving `/mcp`.
3. Start the candidate image with the same trusted MCP identity/configuration.
4. Check readiness, then run the script in dry-run mode again and verify all
   eight named command guard/preview indexes.
5. Send one non-business preview smoke request. It must create only one
   `commandpreviews` metadata record; do not run a confirm smoke against real
   financial data without an approved fixture.
6. Re-enable traffic, monitor command receipts/audits and preview errors, and
   keep the old image fenced for the rollback window.

## Rollback

If the candidate is unhealthy before any writer is used, restore traffic to the
previous image and leave additive indexes in place. Do not drop indexes or
delete preview/receipt records after a writer has committed data. If the
candidate wrote previews but no business command, retain records for
investigation and create a fresh preview after rollback. Token v1 from a fenced
old pod and token v2 from a new pod are intentionally incompatible.
