# System map

Baseline: [assessment sections 1–5, 11, 15](../.ai-discovery/REPOSITORY_ASSESSMENT.md). Facts here are discovery-derived; proposed verification lives in the other `.ai` documents.

## Product purpose

Workspace-scoped personal finance tracking: personal spending, actual cash movement and credit debt are separate views. No bank payment execution was demonstrated.

## Runtime topology

```text
Browser → HTTPS nginx ingress → HTTP Next.js :3000
→ relative /api rewrites → Fastify :3001 → services → Mongoose → MongoDB
MCP client → HTTPS /mcp → bearer/fixed-context MCP adapter → same services
Backend scheduler → SMTP → reminders/calendar recipients
```

Ingress sends `/mcp` and `/docs` to backend, `/` to frontend. Production Next rewrites default to `backend:3001`; external chart retains that Service alias. Public health routing is absent. Backend owns session/auth/workspace enforcement. MCP server availability does not imply coding-agent MCP access.

## Repository boundaries

| Boundary | Responsibility / location |
| --- | --- |
| Frontend | `frontend/app`, `components`, `lib/api`; display, browser clients, coarse cookie gate |
| Backend composition | `backend/src/server.ts`, `runtime-routes.ts`; REST/MCP/jobs and lifecycle |
| Domain/services | `backend/src/financial-domain.ts`, `services/`; financial calculations and commands |
| Persistence | `backend/src/models`, `database.ts`; schemas, explicit workspace filters, indexes |
| Contracts | `shared/src`; framework-free runtime schemas/DTOs consumed by both packages |
| CI | `.github/workflows`; quality, two images, external GitOps reference update |
| GitOps (external) | `../k8s-namepsace-chart/card-credit`, `gitops/workloads.yaml`; manifests/Argo ownership |

Three npm packages, local `file:../shared` dependency; no new workspace framework needed.

## Accounts

DEBIT/CASH/E_WALLET hold real money; CREDIT represents debt. Opening/current balance and merge behavior: `backend/src/services/account-service.ts`, `models/account.ts`. High risk: derived balance/foreign-key consistency.

## Transactions

`financial-domain.ts`, `services/financial-transaction-service.ts`, `models/financial-transaction.ts`. Stored impacts drive reporting; edits/deletes affect history. Hard-delete behavior is a known mismatch with preservation instructions.

## Cards

`services/card-lifecycle-service.ts`, `card-query-service.ts`, `models/credit-card.ts`: card identity, catalog snapshots, account links and lifecycle.

## Statements

`models/card-statement.ts`, `services/statement-query-service.ts`, `statement-domain.ts`: persisted periods, due dates and debt summaries. Keep card/workspace/statement parent relationships intact.

## Payments

`services/statement-payment-command-service.ts`, `command-guard-service.ts`: settlement, state transition, preview, idempotency and transaction. See [statement-payment invariant](FINANCIAL_INVARIANTS.md#statement-payment).

## Reimbursements

`financial-domain.ts`, `services/receivable-repair-service.ts`: paid-for-other spending and receivable settlement. Reimbursement is not statement debt repayment.

## Fees

`services/fee-command-service.ts`, `fee-query-service.ts`: actual card fee records affect benefit reporting. Deletion requires history-policy resolution.

## Cashback

`services/monthly-cashback-command-service.ts`, `monthly-cashback-query-service.ts`: monthly expected/received/rejected bank cashback; distinguish transaction estimates and reimbursement. Hard-delete exposure exists.

## Budgets

`services/finance-budget-service.ts`, `finance-category-service.ts`, `recurring-expense-service.ts`: spending plans/categories/recurrence; do not count statement settlement as another expense.

## Reports

`services/financial-report-service.ts`, `cash-flow-query-service.ts`: aggregated spending, money and debt. Constant arithmetic assertions are insufficient evidence of production reporting behavior.

## Reminders

`reminder-scheduler.ts`, `mail-service.ts`, `services/calendar-subscription-service.ts`: scheduled delivery and private calendar tokens. Financial smoke must not unintentionally send email.

## Catalog/admin

`app.ts`, `services/admin-user-service.ts`, `frontend/data/card-presets.json`: global catalog/user administration; explicit baseline import, empty catalog valid. No fixture import at application startup.

## MCP

`backend/src/mcp`, `config.ts`: fixed identity, read default; external chart enables writes with fence acknowledgement. Actual fencing and credential rights remain unverified. All mutations retain service-level protections and applicable human confirmation.

## High-risk cross-cutting modules

Money/history/accounts/statements above; `command-guard-service.ts` and receipt/preview/audit models; `auth.ts`, `password.ts`, `context.ts`; explicit workspace filters in every query; MCP writer settings. Domain safe-integer checks are not universal database enforcement. No model judgment substitutes for invariant tests.

## Human bottlenecks

Humans currently decide final financial validity, safe sandbox/identity, production classification, writer fencing and acceptable delivery. Log reads were possible in discovery; humans need not manually relay every log. Target evidence reduces repeated judgment only within an authorized scope.
