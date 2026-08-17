# Plan hợp nhất Frontend, MCP và Backend

## 0. Execution status ledger

This section is the resumable execution log. Update it after every completed
feature, review decision, commit and push. A checked item means the code,
verification evidence and remote commit are complete; a pending item is not
implemented yet.

| Phase | Status | Current checkpoint | Commit/push | Next action |
|---|---|---|---|---|
| Phase 0 — Contract freeze và compatibility ledger | `IN_PROGRESS` | Account, MCP manifest, Catalog, Card read/write, REST docs inventory, runtime REST parity, Statement Read v1, MCP preview hardening, SRS risk ledger, notification, calendar, reminder, one-off calendar email, creditStatements, frontend private-route guard, smoke report, report UI/API cleanup, benefits report contract, account-card validation, fee read parity, monthly cashback read parity, MCP benefits read tools, duplicate REST/frontend read parity, duplicate MCP read parity, trusted private reads, cash-flow read contract, MCP cash-flow query, REST/MCP parity guard, Fee/Cashback REST command-service boundary, Calendar Subscription command boundary, Calendar Subscription list service, Calendar feed composition service, statement calendar email service, monthly cashback validation boundary, shared email validation primitive, bounded calendar subscription list, bounded workspace notes list, bounded legacy masterdata lists, Notes trusted mutation context, Profile trusted mutation context, Workspace owner trusted mutation context, Masterdata trusted admin context, Admin users/audit trusted admin context, Catalog admin trusted admin context, Calendar email trusted identity context, Calendar Subscription contract parity, Masterdata GET contract parity, User/Profile contract parity, Auth Session contract parity, Report date-range contract parity, Credit-statement report contract parity, shared calendar-date contract parity, persistent one-time MCP preview guard, command-previews index rollout, catalog startup write removal, frontend/backend clean linked-runtime image fixes, MCP read-default/fence acknowledgement guard, REST authorization metadata, bounded transaction list, route service-boundary guard, password reset SMTP delivery, chart-controlled MCP writer rollout, candidate image publication/GitOps handoff, read-only MCP desired-state/live reconciliation, CI npm test entrypoint, CD generic-node handoff, curated CI regression entrypoint, Jenkins runtime validation và production-surface docs cleanup đã có evidence; proxy migration `0e6e8e8` có source/local validation evidence; Jenkins `#370` checkout/test pass nhưng bị abort thủ công ở image publication, tag `0e6e8e883cf1` không tồn tại; runtime hiện vẫn `3fffccda40e8`, Argo `Synced/Healthy` revision `9d5fc37` | `c41d6ae` + `6a93e14` + `0ee1156` + `8def2dd` + `995149c` + `e8a3952` + `72d296f` + `7ab6918` + `3145c0c` + `b58a621` + `71dfa58` + `51d3a79` + `4acd3ea` + `7f04f18` + `57bc0c4` + `c3787b9` + `7ed8505` + `6e5367e` + `38ef8ef` + `eea32cf` + `e8f4066` + `b00f5b6` + `8f5c7a0` + `0e6e8e8` / chart `6bfa41f` + `cfb1ccb` + `643a450` + `d4f708a` + `3cf2339` + `e05d8ea` + `127bb6b` + `2edfeae` + `3c1d35e` + `c61312f` + `2ac41d8` + `e9b1886` + `7cdf81d` + `dcb6244` + `9d5fc37` / CI `9aba1d4` + Jenkins `#353` + `#359` + `#362` + `#363` + `#364` + `#365` + `#367` + `#368` + `#370 (ABORTED)` / CD `9aacbf6` / `origin/master` | Resolve publication evidence for `0e6e8e8` without claiming #370; then continue external old-writer fence/drain evidence; keep MCP writer mode read-only |
> Phase 0 ledger supersession: proxy migration `0e6e8e8` đã được Jenkins `#373` checkout qua `19f068f`, pass shared/frontend/backend `25/45/135`, publish image tags `19f068f18d53`, handoff GitOps chart `952c0fc` và candidate runtime read-only smoke pass. Old-writer, session-version và financial decisions vẫn mở.

### Checkpoint: category source-of-truth cleanup and report guard

- Scope: `DECISION-REP-01` xác nhận `FinancialTransaction.categoryId` là source
  authoritative cho report/budget grouping; `FinanceCategory` chỉ là planning
  catalogue metadata. Report không join category catalogue và không đọc card
  `monthlyData`; category CRUD không backfill hay rewrite ledger records.
- Cleanup: xóa `POST /api/finance/categories/defaults` và
  `FinanceCategoryService.ensureDefaults()` sau zero-consumer audit; giữ
  `GET/POST /api/finance/categories` vì đây là canonical planning surface.
- Regression evidence: category REST list/create dùng trusted context; unauthenticated
  routes fail closed; report test asserts zero category-catalogue read và không
  trả `monthlyData`; backend `npm run validate` pass typecheck, lint, `155/155`
  critical tests và build.
- Safety: không có database write, migration, reconcile, Kubernetes mutation
  hoặc financial mutation.

| Phase 1 — Access & Tenancy + contract foundation | `IN_PROGRESS` | Trusted context, identity revalidation, absolute session expiry, session version/revoke guard, register workspace policy, private read adapter revalidation, Notes POST + `NotesService`, Profile PATCH + `ProfileService`, Workspace owner PUT, Masterdata admin/query/command service, Masterdata GET contract parity, User/Profile contract parity, Auth Session contract parity, Admin users/audit và Catalog admin trusted admin context, AdminUserService boundary, `/api/auth/me` actor boundary, login + `AuthSessionService`, register + `AuthRegistrationService`, bootstrap + `AuthBootstrapService`, forgot/reset-password + `ForgotPasswordService`/`PasswordResetService`, shared `auth-policy` primitive và auth adapter normalization, password reset SMTP delivery đã có source/test evidence; một số direct mutation routes còn thiếu | `b75fb28` + `4578eb7` + `8def2dd` + `85bbc17` + `9d9c976` + `1fe15a2` + `c8e08fb` + `0713812` + `7a3ccdf` + `1983b23` + `35dcf51` + `72292f4` + `74b03ff` + `2034060` + `a212056` + `7743db0` / origin/master | Candidate gate Jenkins/Argo chỉ chạy sau khi push batch; tiếp tục private direct-model route coverage và session version/policy runtime |
| Phase 2 — Card Portfolio integrity | `IN_PROGRESS` | Catalog, Card read service, create/update command, canonical duplicate REST/frontend read và duplicate MCP query đã push; route service-boundary guard xác nhận chỉ card lifecycle route còn direct model dependency; delete/merge policy còn thiếu | `318ba16` + `89e3091` / `origin/master` | Chờ user chốt RESTRICT/REASSIGN/CASCADE trước delete/merge; giữ REST inventory drift gate |
| Phase 3 — Financial Ledger | `IN_PROGRESS` | Account/Financial Transaction contracts, HMAC preview token v2, persistent one-time consume, commandpreviews indexes applied/verified, honest MCP audit metadata, CREDIT account-card validation, financial transaction list query parity, generic guard và Account/Financial Transaction REST+MCP command wiring đã push; direct MCP manifest default read và write fence acknowledgement đã push; candidate `7f04f18152b4` runtime reconcile read-only, chưa mở writer/confirm | `87e7996` + DB rollout + `ee05cc9` + chart `6bfa41f` + `d4f708a` + `3cf2339` + `7f04f18` / chart `127bb6b` / origin/master | Xác minh external old-writer consumers/traffic; không chạy confirm tài chính trong smoke |
| Phase 4 — Credit Billing & Settlement | `IN_PROGRESS` | Statement Read v1, malformed-id fail-closed correction, REST/Frontend payment command boundary, canonical browser preview contract, generic command guard và browser trusted one-time confirmation đã push; strict action, persisted-impact totals, real-money account selection, PAID lock, bounded unique-payment retry, receipt/audit cùng transaction, stable frontend retry key, exact preview metadata, HMAC domain/context binding, stale-version rejection và retry-safe hash đã code. Legacy payment reconciliation planner/quarantine và explicit operator mark-paid đã apply live; MCP payment preview/confirm đã code/parity-test; candidate `7f04f18152b4` runtime read-only, chưa gọi preview/confirm mutation; reversal còn mở | `1044636` + `ee05cc9` + chart `6bfa41f` + `e8a3952` + `d4f708a` + `3cf2339` + `7f04f18` / chart `127bb6b` / origin/master | Candidate runtime đã evidence; còn external old-writer consumer/traffic fence, giữ preview-only smoke và xin user decision riêng trước reversal/compensating transaction |
| Phase 5–8 — Benefits, Planning, Reporting, Engagement | `IN_PROGRESS` | Planning Budget, Notification + `NotificationService`, private Calendar feed, Payment Reminder, one-off Calendar Email, creditStatements, Frontend private-route guard, report UI cleanup, benefits/report parity, refund-aware fee formula, canonical fee read parity, monthly cashback read parity, MCP benefits read tools, monthly cashback validation boundary, shared email validation primitive, bounded calendar subscription list, bounded workspace notes list, bounded legacy masterdata lists, recurring service và REST lifecycle adapter, cash-flow read contract, MCP cash-flow query, REST/MCP parity guard, REST Fee/Cashback command services, Calendar Subscription command boundary, Calendar Subscription list service, Calendar feed composition service, statement calendar email service, Notes trusted mutation context, Calendar email trusted identity context, Calendar Subscription contract parity, Report date-range contract parity, Credit-statement report contract parity và shared calendar-date contract parity đã push; MCP mutation guard và legacy category migration chưa mở | `95c8db0` + `0713812` + `08f7471` + `523fcc5` + `98ca53f` + `71dfa58` + `51d3a79` + `4acd3ea` + `57bc0c4` + `c3787b9` + `53ff49d` / origin/master | Chờ chốt owner/card/year/month filter semantics, cash-flow semantic join và legacy fee-category migration; recurring generation vẫn ngoài schedule-only contract; giữ payment state/command guard riêng |
| Phase 9–10 — Compatibility removal + release validation | `IN_PROGRESS` | Đã xóa nhóm `docs/refactor*` obsolete, frontend fee-payment/card-presets/unused catalog type, backend server-side card-product-image cache, obsolete account-index repair, superseded finance-domain plan, deprecated preview-token alias/wrappers và unreferenced admin catalog aliases sau zero-consumer audit; statement/report reads đã có bounded cursor contract. Backend fee API, legacy receipts, card `monthlyData` và operator reconciliation vẫn có consumer hoặc removal decision riêng | `b63d546` + `c997bc5` + `6411dc6` + `fada443` + `1194b06` + `b7c37a5` + `4af45e6` + `0a8bc90` / origin/master | Tiếp tục xóa từng dead path có zero consumer; compatibility/persistence path chỉ xóa sau migration decision và release gates |

### Runtime read-only checkpoint: current candidate is not latest source

- Context/namespace: Kubernetes context `k8s-admin-public`, namespace
  `card-credit`.
- Current deployment evidence: backend/frontend đều `1/1` Ready, restart `0`,
  image `nexus.apps.drgdevlab.com/card-credit/{backend,frontend}:3e4744dc26fc`.
  Backend env metadata là `MCP_WRITER_MODE=write` và
  `MCP_OLD_WRITER_FENCED=true`.
- GitOps evidence: chart repository clean tại commit `33a4ad6`; source
  repository hiện đã tiến tới `109ee42` (gồm canonical report `cardId` filter
  và regression-test fix), vì vậy runtime hiện tại chưa chứng minh các feature
  recurring/report/UI mới.
- Read-only endpoint evidence: `/health` và `/ready` trả `200`; `/docs/json`
  trả `200` với MCP `Streamable HTTP`, fixed context
  (`MCP_USER_ID`/`MCP_WORKSPACE_ID`), policy
  `Preview -> explicit confirmation -> idempotent confirm`, `writerMode=write`
  và `17` tools. Runtime `auditStatus=PENDING`, nên chưa claim receipt/audit
  traffic hoặc financial mutation evidence.
- Safety: chỉ đọc deployment/chart metadata; không sync, restart, scale, patch,
  exec mutation, database change hoặc financial mutation.

### Current runtime read-only refresh: image dffcd9ba5f16

- Context/namespace verified as `k8s-admin-public` / `card-credit`; backend and
  frontend deployments are `1/1` Ready and pods report restart count `0`.
- Both live images are
  `nexus.apps.drgdevlab.com/card-credit/{backend,frontend}:dffcd9ba5f16`.
  This image includes the report-filter chain through `dffcd9b`, but does not
  prove the newer cleanup commit `7b6fb64` is live.
- Deployment metadata remains `MCP_WRITER_MODE=write` and
  `MCP_OLD_WRITER_FENCED=true`. Read-only port-forward checks returned
  `/health` `200 {"status":"ok"}`, `/ready` `200 {"status":"ready"}` and
  `/docs/json` `x-mcp.writerMode=write`, 17 tools and `auditStatus=PENDING`.
- No MCP tool invocation, preview/confirm, database operation, restart, scale,
  patch or rollout command was executed. Runtime evidence therefore does not
  claim financial receipt/audit or latest-source acceptance.

### Current runtime read-only refresh: image 7c9ba864114f

- Context/namespace verified as `k8s-admin-public` / `card-credit`; deployments
  `card-credit-backend` và `card-credit-frontend` đều `1/1`, pods Ready và
  restart count `0`.
- Both live images are
  `nexus.apps.drgdevlab.com/card-credit/{backend,frontend}:7c9ba864114f`;
  source commits sau image này (`dbe7fc3`, `544b700`, `d991208`, `6fc1db9`,
  `a286d00`, `d09c044`, `b63d546`, `a02704c`) chưa có runtime acceptance
  evidence.
- Deployment metadata remains `MCP_WRITER_MODE=write` and
  `MCP_OLD_WRITER_FENCED=true`. Read-only pod inspection confirmed
  `MONGODB_URI` is present but `FINANCE_MIGRATION_WORKSPACE_ID` is absent; do
  not guess a workspace, so `audit:finance` was not executed against the live
  database.
- No MCP tool invocation, preview/confirm, database operation, restart, scale,
  patch or rollout command was executed. This refresh therefore records only
  runtime health/config metadata and does not claim financial receipt/audit,
  orphan completeness or latest-source acceptance.
- Commit/push: `f4f673b` đã push lên `origin/master`.

### Runtime read-only SMTP metadata refresh

- Backend deployment uses `envFrom` Secret reference `card-credit-runtime`; key
  metadata contains `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`,
  `SMTP_FROM_ADDRESS` và `SMTP_SECURE` alongside auth/Mongo keys.
- Only Secret key names were inspected; no Secret values were read or printed,
  and no email was sent. Therefore this proves configuration wiring metadata,
  not SMTP connectivity, sender ownership or delivery evidence.
- `GAP-AUTH-01` remains `PARTIAL` until an approved test recipient/owner and
  runtime delivery evidence exist.
- Safety: read-only Kubernetes metadata inspection; no Secret mutation,
  restart, rollout, database or mail side effect.

### Runtime read-only refresh: image `5267c79cf437`

- Context/namespace verified as `k8s-admin-public` / `card-credit`; backend and
  frontend deployments are `1/1`, pods `Running`, restart count `0`.
- Both deployment images are
  `nexus.apps.drgdevlab.com/card-credit/{backend,frontend}:5267c79cf437`.
  Repository `HEAD` is newer (`e38e153`), so the live image does not prove the
  report cursor, statement pagination or subsequent cleanup source.
- Deployment metadata remains `MCP_WRITER_MODE=write` and
  `MCP_OLD_WRITER_FENCED=true`; these values are configuration metadata, not
  evidence of external old-writer traffic fencing.
- No MCP invocation, preview/confirm, Secret value read, database operation,
  restart, scale, patch or rollout command was executed. This refresh therefore
  claims only pod/image/config metadata and keeps financial/runtime targets
  unclaimed.
- Commit/push: `e947339` đã push lên `origin/master`.

### Runtime read-only refresh: source HEAD `46eecd1`

- Context/namespace verified as `k8s-admin-public` / `card-credit`; backend and
  frontend deployments are `1/1`, pods `Running`, restart count `0`.
- Both deployment images remain
  `nexus.apps.drgdevlab.com/card-credit/{backend,frontend}:5267c79cf437`,
  while source HEAD is `46eecd1` (`docs: record catalog type cleanup`), so the
  current pod does not prove the latest cleanup source.
- Deployment metadata remains `MCP_WRITER_MODE=write` and
  `MCP_OLD_WRITER_FENCED=true`; these values do not prove external old-writer
  traffic fencing or financial receipt/reconciliation evidence.
- Safety: read-only Kubernetes metadata inspection only; no MCP invocation,
  preview/confirm, Secret value read, database operation, restart, scale,
  patch or rollout was executed.

### Completed checkpoint: Restore chart MCP read-only desired state

- Scope: chart repository `k8s-namepsace-chart` now renders
  `MCP_WRITER_MODE=read` with `MCP_OLD_WRITER_FENCED=true`; image tag remains
  the existing immutable candidate `5267c79cf437`.
- Validation: `helm lint card-credit` passed (icon recommendation only), and
  `helm template card-credit card-credit` rendered the expected read-only env.
- Commit/push: chart commit `9acfebc` đã push lên `origin/master`; remote
  deployment commit `cf4e3a7` was integrated before push, no force-push.
- Runtime boundary: live pod metadata was not mutated; current pod still
  reports `MCP_WRITER_MODE=write` until an explicitly authorized GitOps sync or
  rollout. Desired-state evidence must not be reported as live-state evidence.

### Runtime read-only refresh: chart reconciliation observed

- Read-only Kubernetes check after chart push `9acfebc`: backend pod
  `card-credit-backend-7c5548759d-hvsjj` is `Running`, ready, restart `0`, and
  deployment images remain the immutable candidate
  `nexus.apps.drgdevlab.com/card-credit/backend:5267c79cf437` (frontend uses
  the matching tag).
- Live deployment metadata now reports `MCP_WRITER_MODE=read` and
  `MCP_OLD_WRITER_FENCED=true`. `/health`, `/ready` and `/docs/json` returned
  `200`; this proves liveness/readiness/API-doc availability, not financial
  traffic or receipt/reconciliation behavior.
- Cluster-wide filtered deployment/pod inventory showed only the current
  `card-credit-backend` and `card-credit-frontend` for this application; this
  is evidence that no additional in-cluster card-credit writer pod was
  observed, not proof that external clients stopped sending old-writer traffic.
- Runtime environment presence check found `MONGODB_URI`, `SMTP_HOST` and
  `SMTP_USER` set without printing values; the finance audit workspace selector
  was absent, so no finance audit was executed. SMTP delivery/owner remains
  unproven.
- Read-only SMTP transport verification from the running backend passed with
  `smtpVerified=true`, port `587`, `secure=false`; the command called
  `transport.verify()` only and did not call `sendMail` or print credentials.
- Authenticated read-only MCP `tools/list` returned HTTP `200` with exactly 11
  query tools; the inventory contained no `preview_*` or `confirm_*` tools.
  The check initialized one in-memory MCP session and listed metadata only; it
  did not call a business tool or create preview/receipt data.
- Existing `audit-finance-reconciliation` ran read-only for the fixed MCP
  workspace (workspace ID was not printed): counts were 5 cards, 11 statements,
  45 financial transactions, 7 paid statements, 7 synced payments and zero
  missing payments. All six orphan-reference kinds were zero; source hash was
  `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.
- This closes `GAP-REP-02` only. No repair, reconciliation mutation, payment
  confirm, reversal or compensating transaction was run.
- Live `ensure-data-integrity-indexes` dry-run then returned the required named
  indexes (`credit_card_merge_redirect` and
  `calendar_subscription_user_workspace_device_unique`), with duplicate
  device groups `0`, duplicate card groups `0` and duplicate card IDs `0`.
  Combined with the finance audit's zero orphan references, this closes the
  `GAP-DATA-01`/`GAP-ACC-01`/`GAP-DATA-02` lifecycle/index evidence group.
- Safety: `DATA_INTEGRITY_INDEX_APPLY=false`; no index creation, delete,
  migration, repair or persistence mutation was executed.
- Authenticated read-only MCP `get_personal_finance_summary` for `year=2026`
  returned HTTP `200`, one content block, and the canonical keys
  `byAccount`, `byCategory`, `cash`, `credit`, `creditDebtBalance`, `debit`,
  `eWallet`, `netAssets`, `range`, `realMoney` and `totals`. Totals were not
  printed; this is runtime report-shape evidence only and does not close the
  remaining legacy-category/mutation-source decision in `GAP-REP-01`.
- Safety: only `kubectl get` and read-only `kubectl exec` metadata/localhost
  endpoint checks; no Secret values, MCP invocation, preview/confirm, database
  write, migration, restart, scale, patch or manual sync was executed.

### Completed checkpoint: Make MCP rollout runbook read-only by default

- Scope: `docs/mcp-preview-rollout.md` no longer instructs an operator to switch
  the candidate to `MCP_WRITER_MODE=write` during the rollout runbook. Write
  mode now requires a separate operation-specific decision after independent
  old-writer fence/drain evidence.
- Independent review: GO for documentation safety correction; the runbook keeps
  preview/index/backup/rollback gates and does not remove operational recovery
  guidance.
- Evidence: `git diff --check` pass; active runbook now requires read-only mode
  throughout candidate validation.

### Candidate build checkpoint: source HEAD `de20606`

- Local rootless Buildah built both production images without Docker daemon or
  registry publication:
  - backend `localhost/card-credit-backend:de20606`, digest
    `e33a29ec3344929da40ecdd860af8107635ede1fb8267d3aedfd36deefb2c7d1`;
  - frontend `localhost/card-credit-frontend:de20606`, digest
    `1365f82429747594a23a889cd0e6f2350310217d90187cc74fbcbc949d5d49d9`.
- Build evidence: backend `npm run build` pass; frontend `npm run build` pass,
  all 24 routes generated. Four remote card-image downloads failed during
  `prepare:card-images` and correctly fell back to placeholders; this is a
  non-blocking asset warning, not a build failure.
- Local image smoke: starting the frontend image with Buildah returned `/`
  `200` and `content-type: text/html; charset=utf-8`; the Next server reached
  `Ready` before the smoke process was stopped.
- Boundary: images remain local only; no registry push, chart tag change,
  Kubernetes rollout or database operation was performed. Live pods therefore
  remain on `5267c79cf437`.

### Verification checkpoint: full local SRS §9 gate

- Source HEAD at verification: `beee24f` (docs-only commits after the last
  application source change).
- Shared: `npm run validate` passed build and `28/28` tests.
- Backend: `npm run validate` passed typecheck, lint, critical tests `153/153`
  and production build.
- Frontend: `npm ci --include=optional`, `npm run test:unit` `80/80`,
  typecheck, lint, `npm run test:integration` `6/6` and production build with
  all 24 routes generated.
- No database, Kubernetes, registry or financial mutation was performed by
  this verification gate.

### Completed checkpoint: Add recurring REST lifecycle integration evidence

- Scope: thêm Fastify adapter regression cho recurring `GET/POST/PUT/DELETE`,
  trusted user/workspace context, canonical envelopes và unauthenticated
  rejection; service/model đều được mock nên test không ghi database.
- Independent review: GO cho adapter-only coverage; recurring contract vẫn là
  schedule-only và không tự sinh financial transaction.
- Regression/evidence: targeted recurring tests `6/6`; backend full validation
  typecheck, lint, critical tests `153/153` và production build pass.
- Commit/push: `53ff49d` đã push lên `origin/master`.

### Completed checkpoint: Align report filter requirements documentation

- Scope: cập nhật `docs/requirements.md` để phản ánh canonical report filters
  hiện có (`from/to`, calendar `year/month`, `owner`, `card`) và shared
  REST/MCP/frontend range resolver; không thay đổi runtime contract.
- Independent review: GO cho documentation-only drift correction; stale phrase
  về filter chưa mở không còn trong requirements document.
- Evidence: `git diff --check` pass và targeted stale-reference search không còn
  claim cũ; existing report/parity validation remains the source/test evidence.
- Commit/push: `89d5fe4` đã push lên `origin/master`.

### Completed checkpoint: Remove unreferenced frontend compatibility adapters

- Scope: xóa các file frontend không còn production consumer:
  `cardFeePaymentsCore.mjs`, declaration/client wrappers,
  `CardFeePaymentSection.tsx`, test riêng của path đó và `cardPresets.ts`.
  Fee Center canonical page/client và backend fee API vẫn giữ nguyên.
- Evidence: repository search trước khi xóa chỉ thấy các file này tự tham chiếu
  hoặc test tham chiếu; sau cleanup không còn reference tới các path đã xóa.
  Không xóa backend route/model/service vì chúng vẫn được runtime manifest,
  REST tests, Fee Center/report hoặc compatibility contract dùng.
- Validation: frontend `npm test` pass `45/45`, `test:unit` pass `82/82`,
  integration `6/6`, typecheck, lint và production build pass; build vẫn nhận
  diện `ƒ Proxy (Middleware)`. `git diff --check` pass.
- Rollback: revert commit cleanup để khôi phục các file frontend; không có
  database/schema/migration/data hoặc Kubernetes change.

### Completed checkpoint: Retire unreferenced server-side card image cache

- Scope: xóa `backend/src/card-product-image-cache.ts` và
  `backend/src/models/card-product-image.ts`; không có import, route, job, test
  hoặc runtime consumer. Frontend vẫn dùng `CardProduct.imageUrl` và local image
  manifest.
- Documentation: đánh dấu `cardproductimages` là legacy, không runtime-managed;
  không drop/migrate hoặc đọc dữ liệu collection trong batch này.
- Validation: backend curated `npm test` pass `136/136`, typecheck, lint và
  build pass; `git diff --check` pass; repository search không còn source
  reference tới card-product-image cache/model.
- Rollback: revert commit cleanup để khôi phục source; không ảnh hưởng runtime
  data vì không có active consumer.

### Completed checkpoint: Add report filters and budget write UI

- Scope: Reports dùng canonical `from`/`to` date-range inputs và gọi cùng
  `getFinancialSummary`; Budgets dùng canonical `upsertBudget` client cho
  endpoint `PUT /api/finance/budgets`, sau đó reload status theo tháng.
- Regression: frontend report/budget tests cover filter controls và budget write
  surface; không thêm endpoint shadow, không đổi database/schema/migration.
- Validation: frontend `npm run test:unit --if-present` pass `82/82`,
  integration pass `6/6`, typecheck, lint và build pass.
- Residual: `GAP-UI-02/03` chuyển `OPEN → PARTIAL`; recurring update/delete/
  generation và owner/runtime UI acceptance vẫn chưa claim đóng.
- Rollback: revert commit này để khôi phục read-only UI; không có runtime data
  mutation trong validation.

### Completed checkpoint: Complete recurring schedule lifecycle

- Scope: shared recurring input/output contracts; backend list/create/update and
  soft-deactivate routes scoped by trusted workspace/account; list bounded at
  `100`; frontend `/recurring` page supports create/edit/deactivate and private
  proxy coverage.
- Safety: recurring schedules are configuration only. This slice does not
  generate or persist financial transactions, does not add migration/index/data
  changes, and keeps deactivation recoverable in the record.
- Validation: shared `npm run validate` pass `25/25`; backend typecheck/lint and
  curated `npm test` pass `143/143`; frontend critical pass `46/46`, unit pass
  `82/82`, integration `6/6`, typecheck, lint and build pass; `git diff --check`
  pass.
- Residual: recurring transaction generation and owner/runtime UI acceptance
  remain unclaimed; `GAP-UI-02/03` stays `PARTIAL`, while the recurring slice of
  `GAP-PERF-01` is covered.
- Rollback: revert this commit to remove the new lifecycle surface; no runtime
  financial mutation was executed.

### Completed checkpoint: Add canonical card filter to financial reports

- Scope: shared `reportQuerySchema` accepts optional `cardId`; REST and MCP
  `get_personal_finance_summary` pass the same filter to
  `FinancialReportService`; report service scopes transactions by the card's
  credit account or statement reference and scopes cashback/fee records by card.
  Frontend Reports exposes the active-card selector.
- Safety: malformed or cross-workspace card IDs fail closed; no legacy
  `monthlyData` aggregation, no persistence write, no database/index change.
- Validation: shared `npm run validate` pass `26/26`; backend typecheck/lint,
  build and curated `npm test` pass `143/143`; frontend critical pass `46/46`,
  typecheck, lint and build pass.
- Residual: `GAP-REP-02` remains `PARTIAL` for owner/year/month semantics,
  full filter completeness and orphan reconciliation.
- Rollback: revert this commit; no runtime data mutation was executed.

### Completed checkpoint: Add canonical report owner and calendar filters

- Requirement/GAP: `REP-02`, `UI-02`, `MCP-01` cần cùng semantics cho owner và
  calendar period trên REST, MCP và Reports UI.
- Scope: shared report query nhận `owner`, `year`, `month`; `year`/`month`
  resolve thành full-year hoặc single-month range và fail closed khi trộn với
  `from/to`. Backend tìm card theo trusted workspace + owner, rồi scope account,
  statement, transaction, cashback và fee sources bằng card references. MCP
  manifest và frontend dùng cùng field contract; UI thêm owner/year/month
  controls.
- Tests: shared contract `26/26`; backend report adapter/service/schema tests
  `13/13`, gồm REST/MCP parity, owner card-reference scope và leap-safe month
  range; frontend report regression pass. Full package validation phải chạy lại
  trước khi claim release.
- Safety/limitations: read-only, không sửa ledger/database/index/cluster; orphan
  reconciliation và production/runtime acceptance vẫn chưa được claim.
- Validation: shared `npm run validate` pass `26/26`; backend
  `npm run validate` pass `143/143` plus typecheck/lint/build; frontend unit
  `82/82`, integration `6/6`, typecheck/lint/build pass.
- Commit/push: `0a32cfd` đã push lên `origin/master`; runtime chưa rollout nên
  không claim production UI/MCP acceptance.

### Completed checkpoint: Add deterministic orphan reference audit

- Requirement/GAP: `REP-02`, `DATA-01`, `ACC-01` cần chứng minh orphan không bị
  âm thầm gán sang card/account khác.
- Scope: thêm pure `auditOrphanReferences` inventory cho statement-card,
  account-card, transaction-account, transaction-statement, fee-card và
  cashback-card references; kết quả gồm sorted records, per-kind counts và
  source hash. `scripts/audit-finance-reconciliation.ts` chỉ đọc các collection
  trong workspace và in inventory; không tạo reconciliation case, không mark
  paid, không sửa/xóa dữ liệu.
- Regression: 2 focused tests kiểm tra broken-reference classification,
  immutability và deterministic hash; test này nằm trong curated backend
  `npm test`.
- Residual: chưa chạy live audit vì cần target/snapshot database được phép;
  không dùng source/test để claim production data sạch.

### Completed checkpoint: Remove unreferenced catalog writer helper

- Requirement/GAP: `OPS-01` và compatibility cleanup yêu cầu không còn đường
  startup/operator writer ngoài CLI có guard.
- Audit: `syncCatalogFromFile()` và `mongoStore()` trong
  `backend/src/catalog-sync.ts` không có consumer; CLI chỉ cần
  `catalogPath()`/`readCatalogFile()` để gọi `catalog-import` với dry-run mặc
  định và explicit production guard.
- Changed write-set: xóa helper Mongo upsert không được gọi; giữ nguyên CLI,
  catalog import behavior và production guard. Regression test xác nhận module
  loader không import Mongo hay expose writer.
- Safety: không đổi schema/data/index/cluster; rollback bằng revert commit.

### Completed checkpoint: Bound card, category and fee reads

- Requirement/GAP: `PERF-01` cần giới hạn các workspace list scan còn lại mà
  không phá response array hiện tại.
- Scope: dùng `boundedReadLimit` mặc định/tối đa `100` cho card,
  duplicate-card, finance category, card fee và Fee Center reads; REST nhận
  `limit`, MCP query tools expose cùng giới hạn, frontend cũ không cần đổi vì
  default vẫn giữ nguyên.
- Independent review: GO cho bounded query-only slice. Helper nhận đúng cả
  REST string và MCP number, invalid/zero giữ default `100`, upper bound là
  `100`; không đổi business state, persistence, schema/index, MCP writer mode,
  database hay Kubernetes.
- Regression/validation evidence: targeted read/calendar/MCP/parity tests pass
  `22/22`; shared `npm run validate` pass `26/26`; backend
  `npm run validate` pass typecheck, lint, build và `147/147` tests; frontend
  unit `82/82`, integration `6/6`, typecheck, lint và production build pass;
  `git diff --check` pass.
- Residual: admin audit và financial report aggregation vẫn cần cursor/
  completeness design riêng; không cắt các aggregation report trong slice này.
- Rollback: revert source/docs commit của slice; không có database/schema/data
  hoặc Kubernetes change.
- Commit/push: `dbe7fc3` đã push lên `origin/master`.

### Completed checkpoint: Add stable cursor to admin audit reads

- Requirement/GAP: `GAP-PERF-01` cần completeness cho audit list; `limit` đơn
  thuần có thể làm mất phần còn lại của audit history.
- Scope: `GET /api/admin/audit-logs` sort ổn định theo `createdAt DESC, _id DESC`,
  nhận opaque `cursor`, fetch `limit + 1` để trả `nextCursor`, giữ nguyên các
  filter và envelope cũ; invalid cursor fail closed với `400`.
- Independent review: GO cho admin-only, read-only query slice. Không đổi audit
  records, schema/index/data, financial state, MCP writer mode, database rollout
  hay Kubernetes.
- Regression/validation evidence: admin audit/user tests pass `6/6`; backend
  `npm run validate` pass typecheck, lint, build và `148/148` tests;
  `git diff --check` pass.
- Residual: admin user roster và financial report aggregation vẫn giữ HOLD vì
  cần contract completeness riêng; slice này không claim chúng.
- Commit/push: `544b700` đã push lên `origin/master`.

### Completed checkpoint: Remove superseded implementation plan

- Scope: xóa `docs/implementation-plan.md` vì không còn được docs index dùng,
  không còn là execution source-of-truth và README đã chuyển sang SRS cùng
  unification plan hiện hành.
- Evidence: repository search không còn reference tới
  `docs/implementation-plan.md`; tài liệu hiện hành vẫn được liên kết từ
  `README.md`, `docs/README.md` và `docs/SRS.md`.
- Safety/rollback: docs-only cleanup, không source/runtime/database/index/data
  hoặc Kubernetes change; revert commit để khôi phục nếu cần.
- Commit/push: `d991208` đã push lên `origin/master`.

### Completed checkpoint: Add bounded cursor page for admin users

- Requirement/GAP: `GAP-PERF-01` còn admin user roster đọc toàn bộ collection;
  query form cần bounded page mà không phá response legacy khi không truyền query.
- Scope: Mongo auth repository thêm `listUsersPage(limit,cursor)` với sort ổn
  định `email ASC, _id ASC`, fetch `limit + 1` và opaque `nextCursor`; REST
  `/api/admin/users` chỉ dùng envelope paginated khi có `limit` hoặc `cursor`.
- Independent review: GO cho admin-only, read-only query slice. Không đổi user
  mutation, session policy, schema/index/data, financial state, MCP writer mode,
  database rollout hay Kubernetes.
- Regression/validation evidence: admin cursor tests pass `7/7`; backend
  `npm run validate` pass typecheck, lint, build và `149/149` tests;
  `git diff --check` pass.
- Residual: financial report aggregation vẫn HOLD vì cần aggregation/cursor
  completeness contract riêng; legacy no-query admin response vẫn giữ nguyên.
- Commit/push: `a286d00` đã push lên `origin/master`.

### Completed checkpoint: Add deterministic card duplicate preflight

- Requirement/GAP: `GAP-DATA-01`, `GAP-DATA-02` cần preflight trước khi áp dụng
  data-integrity indexes hoặc xử lý card lifecycle.
- Scope: `ensure-data-integrity-indexes.ts` đọc projection card và báo cáo số
  exact duplicate groups/card IDs theo `workspaceId + presetId + normalized
  owner`, bỏ qua card retired; helper trả kết quả sort ổn định để audit/hash
  downstream không phụ thuộc query order.
- Independent review: GO cho read-only preflight. Không merge/retire card,
  không tạo index, không sửa account/statement/transaction, không database
  mutation và không Kubernetes mutation.
- Regression/validation evidence: duplicate/preflight tests pass `2/2`; backend
  `npm run validate` pass typecheck, lint, build và `150/150` tests; shared
  `26/26` và frontend unit `82/82`, integration `6/6`, typecheck, lint, build
  đã pass trên cùng source baseline. Đây vẫn chưa là live preflight/index
  evidence.
- Residual: script chưa được chạy trên database target; source/test không thay
  thế live dry-run hoặc reconciliation evidence.

### Completed checkpoint: Remove unreferenced destructive account-index repair

- Scope: xóa `backend/scripts/repair-account-index.ts` và npm entry
  `repair:account-index`; repository search trước cleanup chỉ thấy hai path tự
  tham chiếu, không có CI/docs/operator consumer.
- Reason: script cũ có thể `dropIndex` và `updateMany` để unset `creditCardId`,
  trong khi account model đã là canonical index declaration và data-integrity
  workflow hiện tại là explicit preflight/apply. Git history vẫn là rollback
  source; không giữ destructive helper không có owner.
- Safety/validation: docs/source cleanup only, không chạy script, không sửa
  database/index/data/Kubernetes; repository stale-reference search pass; backend
  `npm run validate` pass typecheck, lint, build và `150/150` tests.

### Completed checkpoint: Stream complete financial report source reads

- Requirement/GAP: `GAP-PERF-01` report aggregation phải giữ completeness nhưng
  không nên materialize mọi source collection trong một Mongo query result.
- Scope: `FinancialReportService.summary` consume transaction/account/card/
  statement/cashback/fee/reimbursement sources bằng Mongo cursor batch size
  `100` khi driver hỗ trợ; vẫn đọc hết và aggregate đầy đủ, fallback `.lean()`
  giữ test/repository compatibility. Public financial report DTO/range/filter
  semantics không đổi.
- Independent review: GO cho read-only performance slice. Không thêm limit,
  không bỏ record, không đổi financial formula/persistence/schema/index,
  database/Kubernetes hay MCP writer.
- Regression/validation evidence: financial report service/routes tests pass
  `13/13`, including cursor batch-size and `.lean()` fallback; backend
  `npm run validate` pass typecheck, lint, build và `150/150` critical tests.
- Residual: live performance profile chưa có runtime evidence; các internal
  projections không nằm trong public page contract vẫn phải giữ bounded/read
  policy riêng.
- Commit/push: `3dc8ca5` đã push lên `origin/master`.

### Completed checkpoint: Remove superseded finance domain plan

- Scope: xóa `docs/finance-domain-plan.md` sau khi xác minh không có incoming
  reference; các domain decisions còn dùng được đã có trong `docs/SRS.md`,
  `docs/finance-source-of-truth.md` và execution ledger này.
- Independent review: GO cho documentation-only cleanup; không xóa runbook
  `docs/mcp-preview-rollout.md` vì nó vẫn là operational fence/backup/index
  gate chưa có tài liệu thay thế.
- Regression/evidence: repository stale-reference search không còn reference
  tới file đã xóa; không thay đổi source, persistence, database, Kubernetes hay
  runtime behavior.
- Commit/push: `c997bc5` đã push lên `origin/master`.

### Completed checkpoint: Remove unreferenced preview-token alias

- Scope: xóa `consumePreviewToken`, một deprecated alias không có consumer trong
  source/test/runtime composition; MCP/browser paths dùng codec `verify` và
  persistent `CommandGuardService` trực tiếp.
- Independent review: GO cho zero-consumer source cleanup; không thay đổi token
  format, verification semantics, one-time receipt state, persistence,
  database, Kubernetes hay writer mode.
- Regression/evidence: stale-reference search ngoài execution ledger không còn
  `consumePreviewToken`; backend full validation pass typecheck, lint, build và
  `151/151` critical tests.
- Commit/push: `be2658c` đã push lên `origin/master`.

### Completed checkpoint: Remove unreferenced environment preview wrappers

- Scope: xóa `createPreviewToken`, `verifyPreviewToken` và factory đọc trực tiếp
  `process.env`; không có consumer nội bộ. Canonical runtime tiếp tục dùng
  injected `createPreviewTokenCodec`, giúp test/runtime không có hidden global
  secret dependency.
- Independent review: GO cho zero-consumer source cleanup; giữ nguyên HMAC
  claims, TTL, context binding, preview persistence và command guard.
- Regression/evidence: source/test/runtime search ngoài execution ledger không
  còn hai wrapper; backend full validation phải pass trước commit.
- Commit/push: `1194b06` đã push lên `origin/master`.

### Completed checkpoint: Remove unreferenced frontend catalog adapter

- Scope: xóa `toLegacyCardPreset` và `getLegacyCardPresets` cùng hai regression
  tests chỉ phục vụ compatibility picker cũ; canonical picker hiện dùng
  `CardCatalogProduct` từ `cardCatalogClient`.
- Independent review: GO cho zero-consumer frontend cleanup; vẫn giữ
  `LEGACY_FIELD_MAP` trong validator để fail closed khi catalog input có alias
  lệch canonical fields.
- Regression/evidence: source/runtime search ngoài test path không có consumer
  của hai export; frontend typecheck/lint, unit `80/80`, integration `6/6` và
  production build pass.
- Commit/push: `ca89199` đã push lên `origin/master`.

### Completed checkpoint: Remove unreferenced admin catalog aliases

- Scope: admin catalog REST responses now return canonical `CatalogProductDto`
  directly; xóa `withLegacyAliases` và các `id/bank/bankName/name/type` fields
  không có consumer. Public catalog was already canonical.
- Independent review: GO cho zero-consumer API cleanup; frontend admin page
  uses `presetId`, `providerName`, `displayName`, `network`, `imageUrl` and
  existing audit/security behavior is unchanged.
- Regression/evidence: admin create test asserts no legacy `id` alias; stale
  source/test search không còn `withLegacyAliases`; backend typecheck, lint,
  critical tests `151/151` và production build pass.
- Commit/push: `4af45e6` đã push lên `origin/master`.

### Completed checkpoint: Remove unreferenced frontend catalog type

- Scope: xóa `LegacyCardPresetFields`, type compatibility không có consumer;
  canonical catalog types và legacy card runtime DTOs không thay đổi.
- Independent review: GO cho zero-consumer type cleanup; stale frontend
  source search không còn reference.
- Regression/evidence: frontend typecheck, lint, unit `80/80`, integration
  `6/6` và production build pass.
- Commit/push: `0a8bc90` đã push lên `origin/master`.

### Completed checkpoint: Paginate statement projections with stable cursors

- Requirement/GAP: `GAP-PERF-01` cần bounded public reads cho các projection
  sao kê không phải aggregate, nhưng không được làm mất record hoặc đổi
  statement/payment semantics.
- Scope: shared `statementPageSchema` và
  `creditStatementReportPageSchema`; card-statement REST endpoints và
  credit-statement report endpoint hỗ trợ `limit`/opaque `cursor`, sort ổn định
  theo ngày + `_id`, page envelope tách `items`, `nextCursor`, `limit`; frontend
  client có parser/helper tương ứng; `docs/api.md` ghi rõ cả page contract và
  legacy response. Paginated card-statement items chỉ giữ projection/summary để
  tránh kéo toàn bộ transaction history; legacy response không có query phân
  trang vẫn giữ nguyên shape.
- Independent review: GO cho read-only pagination slice. Cursor bind sort
  field/value/id, workspace filter vẫn áp dụng; không thay đổi financial
  formula, payment state, persistence write, database/index, Kubernetes hay
  MCP writer.
- Regression/validation evidence: shared `npm run validate` pass `28/28`;
  backend `npm run validate` pass typecheck, lint, build và `151/151` critical
  tests; financial report service/routes tests pass `15/15`; frontend
  typecheck/lint, unit `82/82`, integration `6/6` và build pass.
- Residual: live performance profile và completeness evidence trên workspace
  thật còn thiếu; các internal projections không có public page contract vẫn
  phải giữ bounded/read policy riêng.
- Correction: paginated card-statement routes explicitly set
  `includeTransactions=false`, so the bounded page cannot materialize nested
  transaction history; legacy non-paginated routes are unchanged.
- Commit/push: implementation `fada443`, correction `071407e`, regression
  evidence `b915662` đã push lên `origin/master`.

### Completed checkpoint: Bound workspace notes reads

- Requirement/GAP: `GAP-PERF-01` còn một read collection không bounded trong
  Engagement: `GET /api/notes` đọc toàn bộ notes của workspace.
- Independent review: `NotesService` chuẩn hóa `limit` trong khoảng `1..100`,
  mặc định `100`, giữ trusted `workspaceId` và raw-array response hiện tại.
  Mongo repository sort theo `date DESC` và áp dụng `.limit()` trước
  `toArray()`; InMemory repository mirror cùng thứ tự để regression không phụ
  thuộc implementation.
- Changed write-set: GET nhận optional `limit`; docs API cập nhật; thêm service
  clamp test và route regression xác nhận lấy note mới nhất. Không đổi POST
  upsert/delete, schema/index/data, financial domain, MCP writer hay Kubernetes.
- Acceptance evidence: focused Notes tests pass `6/6`; backend
  `npm run validate` pass typecheck, lint, build và `135/135` tests; `git diff
  --check` pass.
- Residual risk: đây là bounded read, chưa phải cursor pagination; các list
  khác và session-version runtime/external old-writer/financial decisions vẫn
  mở. Production statement-payment MCP writer rollout tiếp tục **NO-GO**.
- Commit/push: source commit `57bc0c4` và docs checkpoint `7fc6a75` đều đã được
  push lên `origin/master`.

### Completed checkpoint: Bound legacy masterdata reads

- Requirement/GAP: `GAP-PERF-01` còn hai legacy dimension reads (`banks` và
  `cardtypes`) không giới hạn query.
- Independent review: `MasterdataQueryService` chuẩn hóa `limit` trong khoảng
  `1..100`, mặc định `100`; Mongo repository áp dụng sort canonical rồi
  `.limit()` trước `toArray()`, InMemory repository mirror cùng behavior.
  Trusted auth/admin boundaries và raw-array response không đổi.
- Changed write-set: GET `/api/banks` và `/api/cardtypes` nhận optional limit;
  POST/PUT/DELETE paths không đổi; API docs và route regression cập nhật. Không
  đổi persistence write, schema/index/data, financial domain, MCP writer hay
  Kubernetes.
- Acceptance evidence: focused masterdata tests pass `3/3`; backend
  `npm run validate` pass typecheck, lint, build và `135/135` tests;
  `git diff --check` pass.
- Residual risk: bounded read chưa phải cursor pagination; các list khác,
  session-version runtime, external old-writer fence/drain và financial
  decisions vẫn mở. Production statement-payment MCP writer rollout tiếp tục
  **NO-GO**.
- Commit/push: source/API commit `c3787b9` và docs checkpoint `7ed8505` đều đã
  được push lên `origin/master`.

### Audit checkpoint: Remaining unbounded list reads — HOLD

- Scope review: sau các bounded slices cho transaction, calendar subscription,
  workspace notes và legacy masterdata, source/route inventory còn
  `GET /api/admin/users`, `GET /api/cards`, recurring-expense/category reads,
  fee/fee-center reads và các financial report/cash-flow joins chưa có cursor
  contract chung. `GET /api/admin/audit-logs` đã nhận `limit`; các catalog
  reads là authoritative global configuration và không thuộc slice này.
- Independent review: **HOLD**, không thêm `limit` mặc định âm thầm. Admin user
  roster và card/recurring-expense lists có thể bị thiếu record nếu cắt response;
  fee/report/cash-flow reads còn ảnh hưởng tổng hoặc semantics tài chính. Cần
  contract owner cho `limit`/cursor/filter và regression về completeness trước
  khi thay đổi từng dataset.
- Changed write-set: không đổi source, persistence, schema/index/data,
  financial formula/state, MCP writer hay Kubernetes. Đây là decision record
  để không biến performance fix thành silent data loss.
- Evidence: source route/repository audit đã đối chiếu các list trên với các
  bounded implementations hiện có; không có test hoặc runtime target nào được
  claim từ audit-only checkpoint. Production statement-payment MCP writer vẫn
  **NO-GO**.

### Completed checkpoint: Jenkins `#359` publication for masterdata batch

- Requirement/GAP: xác nhận source batch `7ed8505` (chứa bounded legacy
  masterdata reads), curated CI regression, immutable image publication và
  GitOps handoff riêng; không suy diễn runtime rollout từ Jenkins `SUCCESS`.
- Independent review: Jenkins `#359` checkout đúng `7ed8505533e3a2e5015172e9f9267516d98e51dc`;
  shared/frontend/backend lần lượt pass `25/25`, `45/45`, `135/135`. Build
  kết thúc `SUCCESS`; coverage publisher vẫn báo thiếu `**/coverage/lcov.info`,
  không phải source test failure.
- Image evidence: registry đọc được tag `7ed8505533e3` với backend digest
  `sha256:e1eeaeebcbba950355466599bb919ba07b466bde30b721a15bc5d70cf9d6675a`
  và frontend digest
  `sha256:7114e0d119167a0399b421d47c31093bd1827ac385e52e5fecd52e479abb7725`.
  CI đã push chart repo `master` tới commit `2edfeae` cho tag này.
- GitOps/runtime boundary: tại thời điểm review, remote chart đã ở
  `2edfeae`, nhưng Argo vẫn báo `Synced/Healthy` tại revision
  `127bb6b4177121984eed1cb4cc8d56311da36aa1`; Deployment vẫn chạy
  `7f04f18152b4`, `MCP_WRITER_MODE=read`, `MCP_OLD_WRITER_FENCED=false`. Vì
  vậy batch publication/handoff là **GO**, còn candidate runtime rollout là
  **PENDING**, không restart/scale/patch/exec mutation và không gọi MCP
  preview/confirm.
- Residual/decision: external old-writer consumer/traffic fence-drain,
  session-version runtime evidence và các financial decisions vẫn mở;
  production statement-payment MCP writer rollout tiếp tục **NO-GO**.

### Completed checkpoint: Jenkins `#362` docs checkpoint publication

- Requirement/GAP: xác nhận docs-only checkpoint `6e5367e` qua curated CI,
  immutable image publication và GitOps handoff; không suy diễn runtime
  rollout từ Jenkins `SUCCESS`.
- Independent review: Jenkins `#362` checkout đúng
  `6e5367ebdd326c9ccead218abd65049e22f523bd`; shared/frontend/backend pass
  lần lượt `25/25`, `45/45`, `135/135`. Coverage publisher tiếp tục báo thiếu
  `**/coverage/lcov.info`, không phải source test failure.
- Image evidence: registry đọc được tag `6e5367ebdd32` với backend digest
  `sha256:b44da8b2c30323128d7aa8ed63ef7dbf40484cafd683ec109ae7621b851b7b3e`
  và frontend digest
  `sha256:b292fd517819942d8fce0018cd93ae4f4d3c1cc711cac17b27eb288769db2f70`.
  CI đã push chart repo `master` tới commit `3c1d35e` cho tag này.
- GitOps/runtime boundary: tại thời điểm review, remote chart đã ở `3c1d35e`
  nhưng Argo vẫn `Synced/Healthy` tại revision `2edfeaee...`; Deployment vẫn
  chạy tag `7ed8505533e3`, `MCP_WRITER_MODE=read`,
  `MCP_OLD_WRITER_FENCED=false`. Vì vậy CI/image/GitOps handoff là **GO**,
  candidate runtime rollout là **PENDING**; không trigger sync, restart,
  scale, patch, DB change hoặc MCP mutation.
- Residual/decision: external old-writer consumer/traffic fence-drain,
  session-version runtime evidence và financial decisions vẫn mở; production
  statement-payment MCP writer rollout tiếp tục **NO-GO**.

### Completed checkpoint: Candidate `6e5367ebdd32` read-only runtime

- Requirement/GAP: xác nhận candidate sau Jenkins `#362`/GitOps `3c1d35e` đã
  reconcile và khởi động đúng linked runtime, nhưng không mở MCP writer.
- Independent review: Argo `card-credit` là `Synced/Healthy/Succeeded` tại
  revision `3c1d35ed545b0bb2777331aa9e9870ef706c4777`; backend/frontend đều
  `Ready=true`, restart `0`, chạy tag `6e5367ebdd32`. Image IDs khớp registry:
  backend `sha256:046b906c11ba1d0f517c9ecc6cf0f0a7566abad909a775ca12dbc166b099b180`
  và frontend
  `sha256:e9ae779c33a65742e78436803f50e0265e864a230bc6fffe378963330f4dc664`.
- Runtime smoke: backend `/health` và `/ready` đều trả `200` với lần lượt
  `{"status":"ok"}` và `{"status":"ready"}`; `/docs/json` ghi
  `writerMode=read`, `mutationPolicy=Read-only; mutation tools are not
  registered`. Logs có `SERVER_LISTENING` và không có
  `ERR_MODULE_NOT_FOUND`.
- Safety evidence: live env là `MCP_WRITER_MODE=read` và
  `MCP_OLD_WRITER_FENCED=false`; smoke chỉ đọc health/readiness/docs, không
  gọi MCP preview/confirm, không sửa DB và không scale/restart/patch
  Kubernetes.
- Residual/decision: đây là **candidate read-only GO**, không phải production
  statement-payment writer rollout. External old-writer consumer/traffic
  fence-drain, session-version runtime và financial decisions vẫn mở; writer
  rollout tiếp tục **NO-GO**.

### Completed checkpoint: Jenkins `#364` runtime-evidence publication

- Requirement/GAP: xác nhận commit `eea32cf` (runtime evidence docs batch) qua
  curated CI, immutable image publication và GitOps handoff; không suy diễn
  runtime mới từ Jenkins `SUCCESS`.
- Independent review: Jenkins `#364` pass shared/frontend/backend lần lượt
  `25/25`, `45/45`, `135/135`; coverage publisher tiếp tục báo thiếu
  `**/coverage/lcov.info`, không phải source test failure. Registry đọc được
  tag `eea32cf991d0` với backend digest
  `sha256:1316b2e7543510b8423ed0b6a0bf9b8f3978f3dda7e37cde5e7c503b10a53457`
  và frontend digest
  `sha256:7c1c2aea26d59d91fb4c4586433ff7a300d4c2b743ab4fffec5a8bf8fd5cde4f`.
- GitOps/runtime boundary: CI đã push chart `master` tới `2ac41d8`; tại thời
  điểm review Argo vẫn ở revision `c61312f`, pod vẫn chạy tag
  `38ef8eff4b75`. Vì vậy publication/handoff là **GO**, runtime mới là
  **PENDING**; không trigger sync, restart, scale, patch, DB change hoặc MCP
  mutation.
- Residual/decision: candidate read-only `6e5367ebdd32` trước đó vẫn có
  health/ready/docs smoke evidence; external old-writer fence/drain,
  session-version runtime và financial decisions vẫn mở. Production
  statement-payment MCP writer rollout tiếp tục **NO-GO**.

### Completed checkpoint: Jenkins `#365` latest evidence publication

- Requirement/GAP: xác nhận commit `e8f4066` qua curated CI, immutable image
  publication và GitOps handoff; không suy diễn runtime rollout từ Jenkins
  `SUCCESS`.
- Independent review: Jenkins `#365` checkout đúng
  `e8f40663bec9e38a136f5df0172931ca8eb36df2`; shared/frontend/backend pass
  lần lượt `25/25`, `45/45`, `135/135`. Build kết thúc `SUCCESS`. Coverage
  publisher vẫn báo thiếu `**/coverage/lcov.info`, là warning của publisher,
  không phải source test failure.
- Image evidence: registry đọc được tag `e8f40663bec9` với backend digest
  `sha256:a93b168ea33f570800661b6e3484bebaf0a898e42d5b1827b1a3e89d4f02cc9d`
  và frontend digest
  `sha256:1361838520019dc47541904f22aa46a15bb94bca222becc9a5a8d232d7b1bae6`.
  CI đã push chart repo `master` tới commit `e9b1886` cho tag này.
- GitOps/runtime boundary: tại thời điểm review remote chart đã ở `e9b1886`,
  nhưng Argo vẫn báo `Synced/Healthy/Succeeded` tại revision `2ac41d8` và
  Deployment vẫn chạy tag `eea32cf991d0`. Vì vậy CI/image/GitOps handoff là
  **GO**, runtime mới là **PENDING**; không trigger sync, restart, scale,
  patch, DB change hoặc MCP mutation.
- Residual/decision: external old-writer consumer/traffic fence-drain,
  session-version runtime và financial decisions vẫn mở; production
  statement-payment MCP writer rollout tiếp tục **NO-GO**.

### Completed checkpoint: Candidate `e8f40663bec9` read-only runtime

- Requirement/GAP: xác nhận GitOps handoff từ Jenkins `#365` đã được Argo
  reconcile và candidate linked runtime khởi động đúng, không mở MCP writer.
- Independent review: Argo Application `card-credit` báo revision
  `e9b18861ddd6`, `Synced/Healthy/Succeeded`; backend và frontend đều
  `Ready=true`, restart `0`, chạy tag `e8f40663bec9`. Backend image ID là
  `sha256:a93b168ea33f570800661b6e3484bebaf0a898e42d5b1827b1a3e89d4f02cc9d`;
  frontend registry digest là
  `sha256:1361838520019dc47541904f22aa46a15bb94bca222becc9a5a8d232d7b1bae6`.
- Runtime smoke: từ backend pod, `/health` và `/ready` đều trả `200` với
  `{"status":"ok"}` và `{"status":"ready"}`; `/docs/json` ghi
  `writerMode=read`, `mutationPolicy=Read-only; mutation tools are not
  registered`; logs có `SERVER_LISTENING` và không có
  `ERR_MODULE_NOT_FOUND`.
- Safety evidence: live desired/env vẫn là `MCP_WRITER_MODE=read` và
  `MCP_OLD_WRITER_FENCED=false`; smoke chỉ đọc health/readiness/docs, không
  gọi MCP preview/confirm, không sửa DB và không scale/restart/patch
  Kubernetes.
- Residual/decision: đây là **candidate read-only GO**, không phải production
  statement-payment writer rollout. Independent external old-writer
  consumer/traffic fence-drain, session-version runtime và financial
  decisions vẫn mở; writer rollout tiếp tục **NO-GO**.

### Completed checkpoint: Jenkins `#367` publication for runtime-evidence docs

- Requirement/GAP: xác nhận docs checkpoint `b00f5b6` qua curated CI,
  immutable image publication và GitOps handoff; không suy diễn runtime mới
  từ Jenkins `SUCCESS`.
- Independent review: Jenkins `#367` checkout đúng
  `b00f5b63f26e0133bce0dffffebb193aae946611`; shared/frontend/backend pass
  lần lượt `25/25`, `45/45`, `135/135`. Build kết thúc `SUCCESS`. Coverage
  publisher vẫn báo thiếu `**/coverage/lcov.info`, là warning của publisher,
  không phải source test failure.
- Image evidence: registry đọc được tag `b00f5b63f26e` với backend digest
  `sha256:f4996a894ffa58ea15ae416a98101762435c91a5547c8988de7b15c8e3c03fbc`
  và frontend digest
  `sha256:ec1e95a808af4bb20ae2424e94c30a82f4ed28a4b2ec37a118c0a229f15dfe4b`.
  CI đã push chart repo `master` tới commit `7cdf81d` cho tag này.
- GitOps/runtime boundary: tại thời điểm review remote chart đã ở `7cdf81d`,
  nhưng Argo vẫn báo `Synced/Healthy/Succeeded` tại revision `e9b1886` và
  Deployment vẫn chạy tag `e8f40663bec9`. Vì vậy CI/image/GitOps handoff là
  **GO**, runtime mới là **PENDING**; không trigger sync, restart, scale,
  patch, DB change hoặc MCP mutation.
- Residual/decision: candidate `e8f40663bec9` trước đó vẫn có read-only
  health/ready/docs smoke; external old-writer consumer/traffic fence-drain,
  session-version runtime và financial decisions vẫn mở. Production
  statement-payment MCP writer rollout tiếp tục **NO-GO**.

### Completed checkpoint: Jenkins `#368` and candidate `8f5c7a0765d5` runtime

- Requirement/GAP: xác nhận checkpoint `8f5c7a0` qua curated CI, immutable
  image publication, GitOps handoff và read-only runtime smoke.
- Independent review: Jenkins `#368` checkout đúng
  `8f5c7a0765d52b36af6fdfa7d8ac4e6b2c27ba5d`; shared/frontend/backend pass
  lần lượt `25/25`, `45/45`, `135/135`. Build kết thúc `SUCCESS`. Coverage
  publisher vẫn báo thiếu `**/coverage/lcov.info`, là warning của publisher,
  không phải source test failure.
- Image evidence: registry đọc được tag `8f5c7a0765d5` với backend digest
  `sha256:8eb2f4a5d82620940cd25ae496508c16b2431267849a1c3438a80a180d679520`
  và frontend digest
  `sha256:6cdbad40125dd9c19ab00d4d7ccc0816d5abf340f5dab6d3fc9b0ac4a6004576`.
  CI đã push chart repo `master` tới commit `dcb6244` cho tag này.
- Runtime evidence: Argo Application `card-credit` báo revision
  `dcb6244ad29657102e1819c84edbe626b550dc51`, `Synced/Healthy/Succeeded`;
  backend/frontend đều `Ready=true`, restart `0`, chạy tag
  `8f5c7a0765d5`. Backend image ID khớp registry; `/health` và `/ready` trả
  `200` với `{"status":"ok"}` và `{"status":"ready"}`; `/docs/json` ghi
  `writerMode=read`, `mutationPolicy=Read-only; mutation tools are not
  registered`; log có `SERVER_LISTENING` và không có
  `ERR_MODULE_NOT_FOUND`.
- Safety/residual: smoke chỉ đọc health/readiness/docs, không gọi MCP
  preview/confirm, không sửa DB và không scale/restart/patch Kubernetes.
  External old-writer consumer/traffic fence-drain, session-version runtime
  và financial decisions vẫn mở; production statement-payment MCP writer
  rollout tiếp tục **NO-GO**.

### Audit checkpoint: External old-writer inventory and traffic — NO-GO

- Independent inventory: read-only cluster scan found only the two
  `card-credit` Deployments; the only writer-related environment names are
  `MCP_WRITER_MODE` and `MCP_OLD_WRITER_FENCED` on the backend. No separate
  workload, Service or Ingress for an old statement-payment writer was found.
- Traffic evidence: the ingress controller aggregate for the previous 24h
  contained `174` requests for `card-credit.apps.drgdevlab.com` and `0` requests
  whose request path was `/mcp`. The `13` statement/payment text matches were
  REST/UI paths (`/api/accounts`, `/api/card-statements` and `/payments`), not
  MCP writer traffic. This is useful negative evidence, not proof that an
  external client or writer is absent outside this ingress.
- Desired/live boundary: chart remote `master` is `2edfeae`, while Argo still
  reconciles `127bb6b...` and the live backend remains
  `MCP_WRITER_MODE=read`, `MCP_OLD_WRITER_FENCED=false`. No fence, drain,
  enable, scale, restart, patch, database change or MCP mutation was done.
- Decision: **NO-GO** for statement-payment MCP writer rollout. Independent
  owner/consumer and traffic accounting evidence is still required before any
  fence acknowledgement or write-mode change.

### Audit checkpoint: Session-version and revocation evidence — source GO, runtime PENDING

- Source/test evidence: signed browser sessions carry `sessionVersion`,
  `browserActorContext` compares it with the authoritative user record, and
  password/role/workspace changes increment the Mongo repository version. The
  backend curated `npm test` passed `135/135`, including stale-session,
  inactive/locked and moved-workspace regressions.
- Runtime boundary: no authoritative live version-bump/revocation check was
  run against production data. MCP fixed identity revalidation currently checks
  active/locked/workspace state, but has no browser session version to compare;
  changing that requires an explicit MCP identity/version contract and is not a
  safe inference from the existing tests.
- Decision: retain source implementation, mark runtime evidence **PENDING**,
  and do not modify persistence or deploy configuration in this audit slice.

### Completed checkpoint: Jenkins #353 candidate image publication

- Requirement/GAP: xác nhận source checkout, curated CI regression và image
  publication cho application source batch `4acd3ea`; không suy diễn GitOps
  handoff hoặc runtime rollout từ Jenkins `SUCCESS`.
- Independent review: Jenkins build `#353` checkout đúng repository
  `card-credit`, branch `master`, commit `7f04f18152b406bf309d8e24c3990e09eae9d94b`
  (docs checkpoint có application source parent `4acd3ea`). Shared CI chạy
  `npm test --if-present` cho `shared`, `frontend` và `backend`, lần lượt ghi
  nhận `25`, `45` và `134` tests pass; catalog validation ghi nhận `33`
  products; build kết thúc `SUCCESS`.
- Image evidence: Jenkins hoàn tất hai lệnh `skopeo copy`; registry đọc được
  candidate tags `7f04f18152b4`. Backend digest là
  `sha256:f794bca7d4381e502f5bbb952c3b9cc5ab18d6f6cf02a5d4ea25f1eb83ce225b`;
  frontend digest là
  `sha256:d3b964569f9412b0a581eed2253fd0d181118defe4705621eaafcbfbd6f19a69`.
- CI limitations: Docker catalog image fetch có warning `IMAGE_DOWNLOAD_FAILURE`
  và dùng placeholder cho một số preset; Hadolint còn 4 issue không chặn build.
  ESLint publisher ghi nhận 0 issue. Vì vậy đây là candidate publication
  evidence, không phải claim quality/security scan sạch tuyệt đối.
- GitOps/runtime status: chart repo chưa có commit deploy cho tag này; Argo
  `card-credit` vẫn `Synced/Healthy` ở revision `e05d8ea`, còn backend/frontend
  `1/1` chạy tag cũ `7e561331be91`. Không scale/restart/patch Kubernetes, không
  gọi MCP preview/confirm, không sửa database và không thay đổi
  `MCP_WRITER_MODE=read`.
- Residual/decision: CD handoff cho candidate, read-only candidate runtime
  smoke, session-version runtime evidence và external old-writer fence/drain /
  traffic evidence vẫn mở. Production statement-payment MCP writer rollout
  tiếp tục **NO-GO**; reversal/compensating transaction vẫn cần user decision
  riêng.
- Commit/push: evidence này đã được ghi trong execution-plan commit
  `61cabd6`; chưa có chart mutation trong checkpoint đó.

### Completed checkpoint: Candidate `7f04f18152b4` read-only runtime

- Requirement/GAP: xác nhận CD/GitOps handoff và candidate runtime sau Jenkins
  `#353`, vẫn giữ MCP read-only trước external old-writer fence/drain.
- Independent review: remote chart `master` và Argo cùng xác nhận revision
  `127bb6b4177121984eed1cb4cc8d56311da36aa1`; Argo `card-credit` là
  `Synced/Healthy/Succeeded`. Backend và frontend đều `Ready=true`, restart
  `0`, chạy tag `7f04f18152b4`. Image IDs khớp registry: backend
  `sha256:f794bca7d4381e502f5bbb952c3b9cc5ab18d6f6cf02a5d4ea25f1eb83ce225b`
  và frontend
  `sha256:d3b964569f9412b0a581eed2253fd0d181118defe4705621eaafcbfbd6f19a69`.
- Runtime smoke: trong candidate pod, `/health` trả `200 {"status":"ok"}`;
  `/ready` trả `200 {"status":"ready"}`; `/docs/json` trả
  `x-mcp.writerMode=read`, `mutationPolicy=Read-only; mutation tools are not
  registered`, với 11 query tools; logs có `SERVER_LISTENING` và không có
  `ERR_MODULE_NOT_FOUND`.
- Safety evidence: live env vẫn là `MCP_WRITER_MODE=read` và
  `MCP_OLD_WRITER_FENCED=false`. Chỉ CD/Argo tự reconcile theo pipeline; không
  có thao tác scale/restart/patch trực tiếp, không gọi preview/confirm, không
  sửa database và không thực hiện reversal/compensating transaction.
- Scope audit: inventory read-only trong cluster chỉ thấy một backend và một
  frontend `card-credit`; chart/workspace search không thấy thêm old-writer
  workload. Log sample của candidate chỉ có startup signal, không phải traffic
  accounting. Đây vẫn không phải proof về external MCP clients/writers hoặc
  network traffic ngoài cluster.
- Residual/decision: candidate read-only runtime đã **GO có điều kiện**; chưa
  có independent evidence về external old-writer consumer/traffic fence/drain,
  session-version runtime và production statement-payment writer rollout vẫn
  **NO-GO**. Reversal/compensating transaction vẫn cần user decision riêng.
- Commit/push: runtime evidence được ghi trong execution-plan commit kế tiếp;
  chart commit `127bb6b` do CD tạo, không chỉnh trực tiếp chart.

### Completed checkpoint: Enable MCP writer through the GitOps chart

- Requirement/GAP: after the clean candidate runtime smoke, register MCP
  preview/confirm tools on the single backend candidate without calling a
  financial mutation and without changing the database.
- Independent review: GO for the bounded chart/runtime switch. Cluster-wide
  workload inventory found only one `card-credit-backend` Deployment and no
  second card-credit writer workload; the old candidate pod was gone before
  enabling the new pod. This does not prove that no external client or writer
  exists outside Kubernetes. `MCP_OLD_WRITER_FENCED=true` remains an operator
  acknowledgement, not independent fence evidence.
- Changed write-set: chart repo commit `6bfa41f` adds explicit
  `mcp.writerMode=write` and `mcp.oldWriterFenced=true`, renders both env vars
  on the backend, and documents the gate. Argo refresh was requested; no
  Secret, database, schema, index, migration or financial record changed.
- Verification: `helm lint card-credit` passed; rendered values showed
  `MCP_WRITER_MODE="write"` and `MCP_OLD_WRITER_FENCED="true"`; Argo revision
  `6bfa41f46b0c9fbbd6cd1fc4fbcfb0d7c6026b19` is `Synced/Healthy`; Deployment
  is `1/1`; new backend pod is `Running/Ready` with restart `0`; process flags
  match; `/health` and `/ready` return 200; `/docs/json` lists preview/confirm
  MCP tools with `writerMode=write`; logs contain `SERVER_LISTENING` and no
  startup module-resolution error. No preview or confirm mutation was sent.
- Residual risk: external old-writer traffic and consumer drain remain to be
  evidenced. Keep smoke read/preview-only. Reversal or compensating
  transaction remains a separate financial decision and is not implemented.
- Commit/push: chart `6bfa41f` pushed to `origin/master`; this historical note
  is superseded by the later runtime/read-only checkpoints below.

### Completed checkpoint: Candidate image publication and GitOps handoff

- Requirement/GAP: `GAP-CI-01`, `GAP-SEC-01`, `GAP-SEC-02` và release gate cần
  chứng minh source checkout, image publication và GitOps handoff riêng; không
  được suy diễn rollout từ application-repository push.
- Independent review: CONDITIONAL GO cho candidate publication. Jenkins build
  `300` checkout đúng SCM `https://github.com/devsecopslonghn/card-credit.git`,
  branch `master`, SHA `995149cd9645f1ed793b2102597cfd471a9e36b1`; log ghi
  `company-ci@master` và chạy lần lượt `shared`, `frontend`, `backend`. Build
  kết thúc `SUCCESS`, sau khi source validation, Docker build và hai lệnh
  `skopeo copy` hoàn tất cho immutable tags
  `nexus.apps.drgdevlab.com/card-credit/frontend:995149cd9645` và
  `nexus.apps.drgdevlab.com/card-credit/backend:995149cd9645`.
- CD evidence: `cd-platform` checkout chart repo và push commit
  `cfb1ccb1235958bc89e78cbd8939c43e57e99836` (`Deploy card-credit
  995149cd9645`) lên `origin/master`, cập nhật `card-credit/values.yaml` sang
  tag candidate. Đây là evidence publish/GitOps handoff, chưa phải evidence pod
  đã chạy candidate.
- CI limitation: build dùng `Jenkinsfile` tại commit user `2ae2c07`, trong đó
  `sonar`, `trivy` và `codeql` đều tắt; log cũng ghi không có
  `reports/security/**` và coverage publisher không tìm thấy lcov. Vì vậy
  build `SUCCESS` không được coi là security-scan evidence; thay đổi user này
  vẫn được giữ nguyên, chưa tự ý bật lại trong checkpoint này.
- Runtime status at checkpoint: Argo vẫn `Synced/Healthy` ở revision cũ
  `b2c366bc66aaab842195817718fda75d4cbb9343`; backend/frontend vẫn chạy image
  `0513570e1865`, Ready, restart `0`. Chưa có candidate pod evidence, chưa có
  smoke preview sau rollout và chưa có external old-writer fence/drain/traffic
  evidence; production MCP statement-payment rollout tiếp tục NO-GO.
- Safety: không scale/restart/patch Kubernetes, không sửa database và không
  gọi preview/confirm hoặc reversal/compensating transaction trong checkpoint.
- Commit/push: execution-plan evidence được ghi trong commit kế tiếp của
  application repository; candidate chart commit là `cfb1ccb` do CD tự tạo.

### Completed checkpoint: Candidate `e8a3952` runtime evidence

- Requirement/GAP: chứng minh candidate image sau curated CI test đã được
  publish, GitOps handoff và rollout thành công trước khi đánh giá P0
  old-writer fence/drain; không suy diễn từ source push.
- Independent review: CONDITIONAL GO cho candidate runtime. Jenkins build
  `302` checkout đúng SCM `https://github.com/devsecopslonghn/card-credit.git`,
  branch `master`, full SHA
  `e8a395234449570e3c3e38c8e4b03378af82c47e`; build kết thúc `SUCCESS`, gọi
  `npm test --if-present` một lần cho mỗi package, build hai OCI images và
  publish tags `e8a395234449`.
- CD/runtime evidence: chart repo push commit
  `643a4508300d0322c7600ada239021e0904aca75` (`Deploy card-credit
  e8a395234449`); Argo `card-credit` revision `643a450`, `Synced/Healthy`,
  operation `Succeeded`. Backend/frontend Deployment đều `1/1`; pod candidate
  chạy đúng image tag, `Ready=true`, restart `0`, image digests lần lượt là
  backend `sha256:4670633f052243fbaaa3f95f301fc25b1da87fc993c2c22d6e39a76e153396d8`
  và frontend `sha256:90cc6ef43df1246a844f6669456bb001d8ecbdba729a8524d118d8b397c08a7e`.
- Smoke evidence: `/health` trả `{"status":"ok"}`, `/ready` trả
  `{"status":"ready"}`; `/docs/json` có `x-mcp.entries=8` và
  `x-mcp.writerMode=write`; logs có `SERVER_LISTENING` và không có
  `ERR_MODULE_NOT_FOUND`. Cluster-wide inventory chỉ có một
  `card-credit-backend` và một `card-credit-frontend` workload trong namespace
  `card-credit`; đây không phải bằng chứng không có external MCP writer/client.
- Residual/decision: `MCP_OLD_WRITER_FENCED=true` vẫn là operator acknowledgement,
  chưa phải independent proof of fence/drain. Không gọi preview/confirm,
  không scale/restart/patch Kubernetes, không sửa database và không thực hiện
  reversal/compensating transaction. Production statement-payment MCP rollout
  vẫn **NO-GO** cho tới khi có external old-writer consumer/traffic evidence.
- Commit/push: candidate source `e8a3952` và chart `643a450` đã ở `origin/master`;
  application plan evidence được ghi trong `76d5716` và cập nhật ở các
  runtime/read-only checkpoints kế tiếp.

### Completed checkpoint: Restore read-only MCP desired state before fence/drain

- Requirement/GAP: MCP writer mode phải mặc định `read`; không được để
  `MCP_WRITER_MODE=write` chỉ dựa trên acknowledgement khi external old-writer
  fence/drain chưa có evidence.
- Independent review: GO cho chart-only safety correction. GitOps values commit
  `d4f708a` đặt `mcp.writerMode=read` và `mcp.oldWriterFenced=false`; `helm lint`
  pass và rendered backend env là `MCP_WRITER_MODE="read"`,
  `MCP_OLD_WRITER_FENCED="false"`. Đây là desired-state correction, không
  scale/restart/patch Kubernetes và không sửa database.
- Live-state limitation: tại thời điểm ghi checkpoint, Argo vẫn
  `Synced/Healthy` ở revision `643a450` và backend pod vẫn báo
  `MCP_WRITER_MODE=write`, `MCP_OLD_WRITER_FENCED=true`. Không dùng manual
  refresh/sync; cần chờ Argo reconciliation và kiểm tra lại live env/manifest.
  Production statement-payment MCP rollout vẫn **NO-GO** trong khoảng lệch
  desired/live này.
- Commit/push: chart `d4f708a` đã push `origin/master`; desired-state evidence
  được ghi trong application commit `56ef92f`, live reconciliation ở `3e649f2`.

### Completed checkpoint: Live read-only MCP reconciliation

- Requirement/GAP: xác nhận GitOps desired state read-only đã thực sự chạy trên
  candidate, không để khoảng lệch `write/true` tiếp tục làm rollout gate mơ hồ.
- Independent review: GO cho read-only runtime safety. Argo app `card-credit`
  đã tự reconcile revision `d4f708a`, trạng thái `Synced/Healthy`, operation
  `Succeeded`; backend Deployment `1/1`, pod mới Ready, restart `0`, image vẫn
  là candidate `e8a395234449`.
- Runtime evidence: live env là `MCP_WRITER_MODE=read` và
  `MCP_OLD_WRITER_FENCED=false`; `/health` trả `{"status":"ok"}`, `/ready`
  trả `{"status":"ready"}`; `/docs/json` báo `x-mcp.writerMode=read` với 8
  entries; log có `SERVER_LISTENING` và không có startup module-resolution
  error. Cluster workload inventory chỉ có backend/frontend card-credit; không
  ước lượng external client từ đó.
- Residual/decision: candidate không đăng ký preview/confirm writer tools ở
  mode read. External old-writer consumer/traffic fence vẫn chưa có evidence;
  không chạy confirm tài chính, không scale/restart/patch Kubernetes, không sửa
  database và không thực hiện reversal/compensating transaction. Production
  statement-payment MCP rollout vẫn **NO-GO** cho writer enablement.
- Commit/push: chart `d4f708a` và runtime reconciliation đã evidence; checkpoint
  này được ghi trong application commit `3e649f2`.

### Current read-only candidate audit: application source versus live runtime

- Audit scope: đối chiếu application `HEAD`, GitOps chart và live Kubernetes
  state; không refresh/sync Argo, không restart/scale/patch Kubernetes, không
  gọi MCP mutation và không sửa database.
- Source/GitOps evidence: application source `HEAD == origin/master` tại
  `4acd3ea`;
  chart checkout và remote `master` vẫn ở `e05d8ea` (`Deploy card-credit
  7e561331be91`). Vì vậy chưa có evidence chart đã nhận source batch mới.
- Live evidence: read-only context `k8s-admin-public`, namespace `card-credit`;
  backend/frontend `1/1`, pods `Running/Ready`, restart `0`, đang chạy image
  `7e561331be91`. Backend env là `MCP_WRITER_MODE=read` và
  `MCP_OLD_WRITER_FENCED=false`.
- Argo read-only evidence: Kubernetes `Application/card-credit` CRD reports
  `Synced/Healthy`, operation `Succeeded`, revision `e05d8ea`; its sync result
  explicitly records backend/frontend image `7e561331be91`. This proves the
  old GitOps revision is healthy, not that source `4acd3ea` has been built or
  rolled out.
- Review conclusion: local source/shared/backend/frontend evidence đã pass,
  nhưng candidate image publication, GitOps handoff cho `4acd3ea`, Argo
  reconciliation và external old-writer fence/drain còn pending. Production
  MCP statement-payment writer rollout tiếp tục **NO-GO**.

### Completed checkpoint: Simplify shared CI/CD execution and remove superseded plans

- Requirement/GAP: CI test execution phải có một entrypoint duy nhất; CD GitOps
  không được phụ thuộc vào việc provision Kubernetes Pod khi đã có Jenkins node
  sẵn.
- Independent review: GO cho thay đổi platform-boundary. `ci-platform` giữ
  `npm ci`, catalog validation, typecheck và lint, nhưng chỉ gọi
  `npm test --if-present`; test runner của package tự compose unit/integration.
  `cd-platform` dùng `nodeLabel`/`CD_NODE_LABEL` hoặc `node {}` khi không có
  label, không còn `podTemplate`, `POD_LABEL` hay `CD_KUBERNETES_CLOUD` trong
  GitOps adapter. Static regression checks và `git diff --check` đều pass.
- Changed write-set: external CI commit `9aba1d4` và CD commit `9aacbf6`, đã
  push `origin/master`; application repo không đổi Jenkinsfile trong slice này.
  Application source hiện vẫn chạy CI dưới Kubernetes vì image build/scan là
  CI concern; yêu cầu “không start Kubernetes” áp dụng cho CD GitOps stage.
- Compatibility cleanup: xóa `docs/refactor-mcp-plan.md` và toàn bộ
  `docs/refactor/` vì là kế hoạch cũ không có incoming reference và mâu thuẫn
  với transport/roadmap hiện tại. Giữ lại SRS, unification plan, implementation
  plan và MCP rollout runbook vì chúng vẫn là source-of-truth hoặc được
  reference. Không xóa source compatibility code: `McpMutationModel`, finance
  reconciliation, `legacyCardResponse` và portfolio legacy fields vẫn có
  runtime consumer hoặc regression test; xóa chúng bây giờ sẽ làm mất replay,
  reconciliation hoặc REST/data compatibility.
- Operational impact: CD generic node phải có Git, `sed`, POSIX shell và
  writable workspace. Không có Kubernetes mutation, database change, financial
  persistence, preview/confirm hay reversal.

### Completed checkpoint: Curate CI test entrypoints without deleting regression tests

- Requirement/GAP: `npm test` trong CI phải kiểm tra các boundary quan trọng với
  thời gian hợp lý; không chạy lặp nhiều test runner và không xóa full suite.
- Independent review: GO cho test-entrypoint slice. `shared npm test` giữ toàn
  bộ 25 contract tests vì suite nhỏ và mọi contract đều là cross-package
  boundary. `backend npm test` chọn 87 tests từ 27 file cho auth/tenancy,
  MCP read/fence/preview, command guard, statement payment, financial
  transaction, REST/MCP parity, catalog và runtime health. `frontend npm test`
  chọn 45 tests từ core auth, middleware, catalog, billing/statement và
  transaction flows; integration catalog nằm trong cùng entrypoint.
- Verification: curated `npm test` pass shared 25/25, backend 87/87 và
  frontend 45/45. Full suites vẫn pass qua `npm run test:all`: shared 25/25,
  backend 186/186 và frontend 86 unit + 6 integration. Typecheck/lint/build
  gates đã pass ở checkpoint validation gần nhất.
- Changed write-set: package scripts thêm `test:critical` và `test:all`, đổi
  `npm test` sang curated list; không xóa test source. `AGENTS.md`, `README.md`
  và SRS ghi rõ distinction giữa CI curated regression và full suite.
- Operational impact: CI giảm từ 186 xuống 87 backend tests và từ 86 unit + 6
  integration xuống 45 frontend tests trong test entrypoint; full regression
  vẫn chạy được khi operator gọi `npm run test:all`. Không đổi database,
  Kubernetes, financial persistence, preview/confirm hay reversal.

### Completed checkpoint: Jenkins runtime validation for curated CI

- Requirement/GAP: `GAP-CI-01` yêu cầu evidence runtime chứng minh Jenkins
  checkout đúng source và thực thi cùng test entrypoint đã freeze; không lấy
  application push hoặc chart commit làm bằng chứng thay thế.
- Independent review: GO cho CI handoff. Jenkins build `309` checkout đúng
  SCM `https://github.com/devsecopslonghn/card-credit.git`, branch `master`,
  full SHA `3145c0cec7755d486d5e07dd3b03a91c9b36578c`; log có đúng ba lần
  `npm test --if-present` theo thứ tự `shared`, `frontend`, `backend`, pass
  lần lượt `25/25`, `45/45`, `97/97`. Build kết thúc `Finished: SUCCESS`.
- Publication/CD evidence: hai immutable image tag
  `3145c0cec775` được `skopeo copy` thành công; CD checkout chart commit
  `d4f708a` và push `3cf2339` (`Deploy card-credit 3145c0cec775`).
- Runtime limitation: tại thời điểm ghi nhận, Argo vẫn `Synced/Healthy` ở
  revision `d4f708a` nhưng live Deployment còn tag runtime `e8a395234449`;
  vì vậy checkpoint này chỉ đóng CI/source-to-GitOps handoff, không claim
  candidate `3145c0cec775` đã rollout. MCP live vẫn `read`, không gọi
  preview/confirm, không scale/restart/patch Kubernetes, không sửa database
  và không thực hiện reversal/compensating transaction.
- Operational impact: không thay đổi application behavior hay dữ liệu; giữ
  release gate external old-writer fence/traffic evidence và live rollout
  verification ở trạng thái mở.

### Completed checkpoint: Candidate `3145c0cec775` read-only runtime

- Requirement/GAP: xác nhận GitOps handoff từ build 309 đã thực sự chạy trên
  workload hiện tại và không mở mixed MCP writers.
- Independent review: GO cho read-only runtime safety. Argo tự reconcile chart
  commit `3cf233969c382678a1adcfaa8cef85678952b451`, trạng thái
  `Synced/Healthy/Succeeded`; backend và frontend đều `1/1`, pod mới
  `Ready=true`, restart `0`, chạy image tag `3145c0cec775`. Backend image
  digest là `sha256:468b9f736c4aaf10bcb07224522fb1d19fd57bce7d00b286af934d70697467d4`.
- Runtime smoke: request nội bộ từ backend pod trả `/health` `200
  {"status":"ok"}` và `/ready` `200 {"status":"ready"}`. `/docs/json`
  trả `writerMode=read`, 11 query tools, không có preview/confirm statement
  payment tool; log có `SERVER_LISTENING` và không có module-resolution error.
- Safety boundary: live env là `MCP_WRITER_MODE=read` và
  `MCP_OLD_WRITER_FENCED=false`; không gọi MCP mutation, không scale/restart/
  patch Kubernetes, không sửa database và không thực hiện reversal/
  compensating transaction.
- Residual/decision: cluster/repository inventory không chứng minh absence của
  external MCP clients hoặc traffic; old-writer fence/drain và HITL/resource
  binding vẫn là NO-GO cho writer enablement. Rollback bằng GitOps revert về
  chart commit trước đó; không claim database rollback.

### Completed checkpoint: Workspace owner service boundary

- Requirement/GAP: Phase 1 yêu cầu workspace owner read/write đi qua canonical
  application service; route không được giữ persistence hoặc authorization
  business logic ngoài trusted-context adaptation.
- Independent review: GO cho bounded non-financial slice. `WorkspaceService`
  nhận `ServiceContext`, scope mọi read/write theo `workspaceId`, kiểm tra role
  admin và active/unlocked target owner trước khi gọi repository. Route chỉ tạo
  context, chuyển input và map `{ data }`; không đổi public response, schema,
  index hoặc update semantics.
- Changed write-set: thêm `backend/src/services/workspace-service.ts`, đổi
  `backend/src/workspace-routes.ts`, thêm `backend/tests/workspace-service.test.ts`
  và đưa test mới vào curated backend entrypoint. Không có database write khi
  test; production persistence path vẫn là cùng `WorkspaceModel.updateOne`
  upsert với filter workspace hiện tại.
- Verification: curated backend `npm test` pass `89/89`; full
  `npm run test:all` pass `188/188`; backend typecheck, lint và build pass.
- Operational impact: chỉ thay boundary trong application process, không đổi
  dữ liệu/schema, Kubernetes, MCP writer mode, payment persistence, reversal
  hoặc compensating transaction.
- Commit/push: execution-plan evidence và source slice được ghi trong
  application commit `72d296f`.

### Completed checkpoint: Calendar subscription feed service boundary

- Requirement/GAP: private calendar feed token lookup, owner/workspace
  revalidation và access timestamp update phải nằm trong canonical service;
  route không giữ direct `CalendarSubscriptionModel` persistence/query path.
- Independent review: GO cho bounded non-financial slice. `feedContext` validates
  token shape, hashes token for lookup, revalidates active/unlocked user and
  workspace, creates a trusted job context, and best-effort touches
  `lastAccessedAt`; route returns the same opaque 404 and keeps canonical card/
  statement query composition.
- Changed write-set: `backend/src/services/calendar-subscription-service.ts`
  owns feed repository boundary; `calendar-subscription-routes.ts` is reduced
  to adapter logic; curated backend test entrypoint includes the calendar
  subscription regression file. No public envelope, token format, model schema,
  index or business data semantics changed.
- Verification: curated backend `npm run validate` pass `97/97` with
  typecheck/lint/build; full `npm run test:all` pass `188/188`. Existing tests
  prove malformed token/owner workspace mismatch stops before card reads and
  valid feed batches canonical statement amounts.
- Operational impact: no database/schema change, Kubernetes mutation, MCP
  writer change, payment persistence, reversal or compensating transaction.
- Commit/push: execution-plan evidence và source slice được ghi trong
  application commit `7ab6918`.

### Completed checkpoint: Admin audit query service boundary

- Requirement/GAP: admin audit-log query/filter/limit/serialization không nằm
  trực tiếp trong REST route; route phải giữ vai trò auth/context adapter.
- Independent review: GO cho bounded Access & Tenancy slice.
  `AdminAuditService.list` owns normalized filters, bounded limit 1–100, newest
  ordering, safe `_id` serialization and a repository boundary. Admin context
  remains revalidated before service invocation; public response giữ nguyên.
- Changed write-set: thêm `backend/src/services/admin-audit-service.ts` và
  đổi `backend/src/user-routes.ts`; existing admin audit regression remains
  active in curated backend suite. Không đổi collection/schema/index hoặc audit
  event payload.
- Verification: curated backend `npm run validate` pass `97/97` với
  typecheck/lint/build; full `npm run test:all` pass `188/188`; route test
  xác nhận filter normalization, limit và admin authorization.
- Operational impact: application boundary only; không database migration,
  Kubernetes mutation, MCP writer/payment change, reversal hay compensating
  transaction.
- Commit/push: execution-plan evidence và source slice được ghi trong
  application commit `9fdbc3e`.

### Completed checkpoint: Session version revocation and registration workspace policy

- Requirement/GAP: `GAP-SEC-01` và `GAP-SEC-02` yêu cầu revoke/version guard
  authoritative và không cho public client tự chọn workspace membership.
- Independent review: GO cho bounded auth/tenancy slice. Signed cookie ghi
  `sessionVersion` (cookie legacy thiếu claim đọc như `0`), browser context
  đối chiếu version với user record; password reset và admin role/workspace
  update bump version. Public registration reject `workspaceId` và cấp
  workspace opaque ổn định từ toàn bộ normalized email để tránh collision
  local-part giữa các domain.
- Changed write-set: `backend/src/auth.ts`, `auth-repository.ts`,
  `auth-routes.ts`, `context.ts`, auth/context tests, frontend registration page
  và E2E contract, frontend registration regression test, `docs/api.md`,
  `docs/requirements.md`, `docs/database.md`, `docs/SRS.md`. Không đổi ledger,
  payment, financial collections, schema migration hoặc Kubernetes.
- Verification: targeted backend auth/context tests pass (12/12), frontend
  auth/registration tests pass (3/3); full shared validation pass (25/25),
  backend validation pass (183/183, typecheck/lint/build), frontend
  typecheck/lint pass, unit pass (86/86), integration pass (6/6) và build
  pass.
- Compatibility/rollout impact: user records không có `sessionVersion` đọc
  như `0`; password reset hoặc role/workspace change làm cookie cũ
  `401 UNAUTHENTICATED`. Registration payload cũ có `workspaceId` nhận lỗi
  `WORKSPACE_SELECTION_NOT_ALLOWED`; frontend đã bỏ field này.
- Commit/push: `4578eb7` đã push thành công lên `origin/master`.

### Completed checkpoint: REST authorization metadata refinement

- Requirement/GAP: `GAP-WEB-01` cần REST/OpenAPI inventory phân biệt session
  thường, admin role, bootstrap bearer và private calendar token.
- Independent review: GO cho metadata-only slice; route authorization runtime
  không đổi, `x-authorization` chỉ là truthful documentation extension.
- Changed write-set: `backend/src/rest-manifest.ts` đổi security taxonomy;
  `backend/src/api-docs.ts` phát metadata admin/bootstrap/path-token; manifest
  và runtime OpenAPI regression tests; `docs/api.md` và SRS ledger. Không đổi
  model, schema, index, migration, database data hoặc Kubernetes.
- Verification: shared `npm run validate` pass 25/25; backend
  `npm run validate` pass typecheck/lint, 184/184 tests và build; frontend
  typecheck/lint, unit 86/86, integration 6/6 và build pass; targeted REST
  metadata test pass 4/4; `git diff --check` pass.
- Commit/push: `6a1728a` (`refine REST authorization metadata`) đã push lên
  `origin/master`.

### Completed checkpoint: Bounded financial transaction list

- Requirement/GAP: `GAP-PERF-01` yêu cầu list query có giới hạn bounded dùng
  chung cho REST, MCP và frontend; slice này không claim cursor pagination cho
  các collection khác.
- Independent review: GO cho read-only slice. Contract đặt `limit` mặc định
  100, tối đa 100; REST chuyển query string sang number, MCP dùng cùng schema,
  service áp dụng `.limit()` trước `.lean()`, response/envelope không đổi.
- Changed write-set: shared transaction query contract/constants; REST/MCP
  manifest và adapters; `FinancialTransactionService` read query; frontend
  finance client; shared/backend/frontend regression tests; API docs. Không đổi
  financial persistence, transaction state, schema, index, migration, database
  data hoặc Kubernetes.
- Verification: shared `npm run validate` pass 25/25; backend
  `npm run validate` pass typecheck/lint, 185/185 tests và build; frontend
  typecheck/lint, unit 86/86, integration 6/6 và build pass; targeted bounded
  tests pass; `git diff --check` pass.
- Residual risk: các list endpoint khác và cursor/next-cursor pagination vẫn là
  phần mở của `GAP-PERF-01`.
- Commit/push: `0ee1156` (`bound financial transaction list queries`) đã push lên
  `origin/master`.

### Completed checkpoint: Password reset SMTP delivery

- Requirement/GAP: `GAP-AUTH-01` yêu cầu forgot-password có delivery thật nhưng
  vẫn generic để chống account enumeration.
- Independent review: GO cho bounded auth/mail slice. Auth route tạo token hash
  như trước, gửi raw reset link chỉ qua injected `MailService`, response không
  trả token; delivery failure không làm lộ account existence và audit chỉ ghi
  boolean `delivered`.
- Changed write-set: `AuthOptions`/runtime route wiring, SMTP password-reset
  mail composition với HTML escaping, auth regression test và API/SRS docs. Không
  đổi ledger, financial persistence, schema/index/migration hoặc Kubernetes.
- Verification: shared `npm run validate` pass 25/25; backend
  `npm run validate` pass typecheck/lint, 186/186 tests và build; frontend
  typecheck/lint, unit 86/86, integration 6/6 và build pass; targeted auth +
  SMTP tests pass 8/8; `git diff --check` pass.
- Residual risk: production SMTP configuration/delivery monitoring vẫn cần
  runtime evidence; `PASSWORD_RESET_RETURN_TOKEN` chỉ dành cho controlled test
  or local workflows.
- Commit/push: `8def2dd` (`deliver password reset emails`) đã push lên
  `origin/master`.

### Completed checkpoint: Clean frontend image dependency boundary và MCP writer fence guard

- Requirement/GAP: `GAP-CI-01` cần chứng minh frontend image build được trong
  clean context; `GAP-MCP-01`/`GAP-PAY-01` vẫn cần old-writer fence/drain trước
  production rollout.
- Independent review: GO có điều kiện cho bounded code/config slice. Frontend
  Docker builder cài runtime dependency của linked `shared/` package trong
  `deps` stage và truyền cùng workspace sang `builder`; MCP manifest/helper
  trực tiếp mặc định read-only, còn `MCP_WRITER_MODE=write` fail-closed nếu
  thiếu `MCP_OLD_WRITER_FENCED=true`. Biến fence là operator acknowledgement,
  không thay thế evidence fence/drain từ Kubernetes.
- Changed write-set: `frontend/Dockerfile`, frontend Dockerfile regression
  test/package script, MCP config/manifest tests, `docs/SRS.md`,
  `docs/mcp-preview-rollout.md` và README. Không đổi service, model, schema,
  index, migration, financial persistence hoặc cluster.
- CI incident evidence: pasted Jenkins BuildKit log tại source SHA
  `369142d347a692c6b777626e5c6cfbf2be91e023` fail ở `frontend` image
  `next build` với 16 lỗi `shared/src/*: Can't resolve 'zod'`; local package
  build trước đó pass vì workspace còn `shared/node_modules`.
- Verification: shared `npm run validate` pass (25/25); backend targeted
  config/MCP suite pass (7/7), typecheck/lint pass; frontend Dockerfile
  regression + unit pass (85/85); clean temporary context chạy
  `npm --prefix shared ci --omit=dev`, `npm --prefix frontend ci
  --include=optional`, `npm --prefix frontend run build` pass. Docker daemon
  local không truy cập được `/var/run/docker.sock`, nên chưa có native Docker
  build evidence.
- Rollout evidence: read-only `kubectl` context `k8s-admin-public`, namespace
  `card-credit`; backend deployment `replicas=1`, pod Ready
  `card-credit-backend-68ffb6578f-6tzvq` đang chạy image
  `backend:a0e0b00a7515`, cũ hơn `HEAD`. Không scale/restart/patch và không
  gọi database; production MCP write vẫn **NO-GO**, old writer chưa fenced.
- Commit/push: `ee05cc9` đã push thành công lên `origin/master`.

### Checkpoint: Backend runtime linked shared dependency boundary (ready to commit)

- Requirement/GAP: `GAP-CI-01` cần image runtime khởi động được trong clean
  context; log mới cho thấy backend runner fail trước startup với
  `ERR_MODULE_NOT_FOUND: Cannot find package 'zod' imported from
  /shared/src/date-contracts.js`.
- Independent review: GO có điều kiện cho bounded Docker/runtime fix. Root
  cause là `backend/node_modules` ở `/app` không nằm trên ESM ancestor path của
  linked package `/shared`; cài `zod` trực tiếp ở backend không đủ cho runtime
  source path này.
- Changed write-set: `backend/Dockerfile` cài `shared` production dependencies
  ở `deps` và `runner`, truyền `/shared` đã cài sang `builder`; thêm
  `backend/tests/dockerfile.test.ts`. Không đổi application service, schema,
  index, migration, financial persistence, database hoặc Kubernetes.
- Verification: backend targeted Dockerfile test pass; clean context chạy
  shared production install, backend `npm ci`, backend build và import
  `/shared/src/date-contracts.js` + compiled MCP manifest pass. Full shared
  `npm run validate` pass (25/25); backend `npm run validate` pass (183/183,
  typecheck, lint, build); frontend typecheck/lint/integration (6/6)/build
  pass. Native Docker daemon chưa truy cập được `/var/run/docker.sock`.
- Rollout impact: candidate backend image phải build lại từ commit này; không
  rollout hoặc restart pod trong checkpoint này. Sau publish vẫn phải xác nhận
  runtime log không còn `ERR_MODULE_NOT_FOUND` trước MCP fence/drain.
- Live candidate evidence: read-only `kubectl` trên context `k8s-admin-public`,
  namespace `card-credit` xác nhận deployment backend/frontend cùng image
  `d07eda20251f`, backend `replicas=1`, `Ready=true`, restart `0`;
  `/health=200`, `/ready=200`, log có `SERVER_LISTENING` và không có
  `ERR_MODULE_NOT_FOUND`. Process không đặt `MCP_WRITER_MODE` nên dùng default
  `read`; `/docs/json` trả `writerMode=read`, mutation tools `[]`. Đây là
  startup/read-only evidence, chưa phải write rollout hoặc proof old-writer
  fence ngoài deployment này.
- Commit/push: `7c4ae7d` đã push thành công lên `origin/master`.

### Completed checkpoint: Shared calendar-date validation for Catalog and Portfolio

- Independent review: GO cho bounded contract-only slice; không đổi route,
  service, model, index, migration hay database data.
- Changed write-set: `catalogProductSchema.sourceCheckedAt` và
  `cardPortfolioCardSchema.statementDate/paymentDueDate` dùng chung
  `isoDateSchema`; tests cover leap-day acceptance, impossible dates, empty
  values và legacy `DD/MM/YYYY` rejection.
- Verification: `shared/npm run validate` pass (25/25 tests, build) và
  `backend/npm run validate` pass (168 tests, typecheck, lint, build).
- Compatibility/rollout risk: dữ liệu Mongo legacy không phải ISO hoặc ngày
  không tồn tại sẽ bị canonical parser reject ở portfolio endpoint. Trước
  production rollout phải audit/normalize các record đó; không tự động migrate
  trong slice này.
- Database impact: không schema/index/migration/write; không cần backup cho
  commit này.
- Commit/push: ghi SHA ngay sau khi commit và push thành công.

### Completed checkpoint: Remove silent catalog startup writes

- Independent review: GO; bounded operational fix chỉ thay đổi startup
  orchestration, không đổi catalog schema, repository, route hay dữ liệu Mongo.
- Changed write-set: `backend/src/server.ts` không còn import/gọi
  `syncCatalogFromFile()` sau khi kết nối database. Runtime restart chỉ khởi tạo
  API/readiness; catalog baseline tiếp tục được xử lý riêng bởi CLI
  `import:catalog`, dry-run mặc định và production guard
  `ALLOW_PRODUCTION_CATALOG_IMPORT=true`.
- Acceptance evidence: catalog import tests giữ dry-run mặc định, explicit apply
  và production refusal; full backend validation sẽ chạy trước commit/push.
- Database/rollout impact: không migration/index/write dữ liệu và không cần
  backup hay Kubernetes mutation cho code slice này. Restart sau deploy không
  còn overwrite admin catalog changes.
- Residual: operator vẫn phải review baseline trước import; delete/merge card
  policy và old MCP writer fence là các slice độc lập.

### Completed checkpoint: Make frontend runtime-contract dependency explicit

- Independent review: root cause của Jenkins `frontend/test:unit` failure là
  linked package `@card-credit/contracts` import Zod runtime nhưng frontend
  không khai báo Zod direct; khi CI không hoist dependency của linked `shared/`,
  Node fail `ERR_MODULE_NOT_FOUND` trước khi chạy test.
- Changed write-set: thêm `zod` vào `frontend` production dependencies và lock
  file. Không xóa canonical runtime parsing hay hạ test coverage; đây là
  dependency boundary tối thiểu để local, Jenkins và frontend image cùng resolve
  `shared` runtime contracts.
- Acceptance evidence: sau `npm ci --include=optional`,
  `npm run test:unit --if-present` pass 84/84; không có source/database change.
- Residual: Jenkins vẫn cần giữ source checkout gồm `shared/` vì frontend dùng
  file dependency; Dockerfile đã copy shared trước `npm ci`.

### Completed checkpoint: Add fail-closed MCP writer mode

- Scope: independent review GO after making every direct composition default
  fail-closed; add an explicit `MCP_WRITER_MODE` runtime
  switch without changing business services, persistence, or transport auth.
- Changed write-set: config defaults to `read` and rejects unknown values;
  `registerMcpTools` registers query tools in read mode and preview/confirm
  tools only in write mode; `tools/list` and OpenAPI `x-mcp` inventory derive
  from the same mode-aware manifest. Rollout runbook and SRS now require
  explicit `write` only after old-writer fence.
- Acceptance evidence: typecheck/lint pass; focused config/MCP/parity suite
  14/14 pass, including explicit write inventory and default read-only inventory.
  Full backend `npm run validate` pass (182/182 tests, typecheck, lint, build).
  Commit/push: `cff4ef2`.
- Database/rollout impact: no schema/index/data write and no Kubernetes mutation.
  Existing old pod remains enabled until a separately approved fence/drain;
  this switch protects candidate/new images and does not by itself fence the
  old image.

### Completed checkpoint: Compress SRS without losing traceability

- Independent review: GO có điều kiện; giữ stable requirement/GAP IDs, capability
  map, source-of-truth, canonical invariants, rollout gates và verification; đưa
  field-level inventory/implementation history về `docs/api.md`, shared schemas
  và execution plan thay vì lặp lại trong SRS.
- Changed write-set: `docs/SRS.md` rút từ 810 xuống 218 dòng, giữ 8 business
  capabilities, Integration/Platform cross-cutting rules, financial formulas,
  MCP command safety, GAP IDs và requirement ID index. Không đổi code, schema,
  index, migration hoặc database.
- Acceptance evidence: `git diff --check` pass; SRS links tới execution plan,
  `docs/api.md` và `shared/src`; frontend unit evidence vẫn 84/84 từ checkpoint
  dependency trước đó.
- Database/rollout impact: docs-only, không cần backup hay Kubernetes mutation.
- Commit/push: ghi SHA ngay sau khi commit và push thành công.

### Completed checkpoint: Align application Jenkinsfile with shared-contract CI

- Independent review: GO có điều kiện; `ci-platform` iterate tuần tự từng
  `sourceDirectory`, nên thêm `shared` trước consumer không tạo duplicate
  validation và không đổi Sonar inventory. Không sửa `ci-platform`/`cd-platform`
  vì đó là shared-library repositories độc lập.
- Changed write-set: `Jenkinsfile` đổi thành
  `sourceDirectories: ['shared', 'frontend', 'backend']`; `shared/package.json`
  thêm script `typecheck` chạy contract compiler hiện có. Cập nhật
  `AGENTS.md`, `README.md`, `docs/README.md`, `docs/SRS.md`,
  `docs/architecture.md` và `docs/implementation-plan.md` để phân biệt
  application intent, CI shared library và CD GitOps adapter.
- Acceptance evidence: local `shared npm ci && npm run typecheck && npm test`
  pass; frontend 84 unit + 6 integration, typecheck/lint/build pass; backend
  validate 182/182 pass. Chưa có Jenkins runtime execution evidence; sau push
  phải đối chiếu checkout SHA/SCM URL/branch.
- Database/rollout impact: package/pipeline/docs only; không schema/index/data
  write, không trigger Jenkins, không Kubernetes mutation.
- Commit/push: ghi SHA ngay sau khi commit và push thành công.

### Session handoff prompt (copy/paste)

```text
Bạn đang tiếp tục refactor repository /home/longhn0710/workspace/card-credit.
Đọc AGENTS.md, docs/SRS.md (baseline ngắn), docs/frontend-mcp-backend-
unification-plan.md và git status/log trước khi sửa. Làm theo capability vertical
slice, không chia riêng frontend/backend/MCP. SRS là nguồn yêu cầu; execution
plan là nhật ký resumable. Không lặp lại commit đã push và không claim target là
đã đạt nếu chưa có source/test evidence.

Việc đầu tiên: kiểm tra Jenkinsfile có sourceDirectories
`shared,frontend,backend`, sau đó chạy `cd shared && npm ci && npm run typecheck
&& npm test`; tiếp tục `cd frontend && npm ci --include=optional && npm run
test:unit --if-present`. Dependency runtime `zod` phải được resolve trực tiếp
qua frontend/shared. Sau đó chạy backend validate và frontend
typecheck/lint/integration/build theo mục 9 SRS. Nếu lỗi, sửa nguyên nhân nhỏ
nhất, thêm regression test, cập nhật plan, independent review rồi commit/push.

Frontend và backend Dockerfile phải cài runtime dependencies của linked
`shared/` package trong clean image context trước khi build/start; không suy
diễn từ `shared/node_modules` của workspace local. `MCP_WRITER_MODE` và các
helper manifest mặc định `read`; `write` chỉ khởi động khi có
`MCP_OLD_WRITER_FENCED=true` sau khi operator đã có evidence fence/drain.

Khi Jenkins báo lỗi, ghi lại `GIT_COMMIT`/checkout SHA, SCM URL, branch, shared
library revision và source directory đang chạy. Push vào application repository
chỉ chứng minh source đã publish; image/Nexus/GitOps/Kubernetes cần evidence từ
CI/CD stages riêng.

Tiếp tục từ GAP P0 hiện tại: old MCP statement-payment writers vẫn chưa được
fence/drain; production rollout đang NO-GO nếu chưa có candidate image. Không
scale/restart/patch Kubernetes và không sửa DB. Với reversal/compensating
transaction, dừng xin DECISION người dùng trước mọi persistence change; nếu chỉ
đọc/review thì ghi evidence vào plan. Mỗi feature hoàn tất phải cập nhật plan,
chạy validation, commit và push ngay.
```

### Completed checkpoint: Persistent one-time MCP preview confirmation

- Independent review: GO cho bounded Account/Financial Transaction MCP command
  guard slice sau khi sửa expiry/replay semantics, consume transaction boundary,
  context binding và index rollout preflight.
- Changed write-set: HMAC preview claims v2 thêm server-generated `previewId`;
  `PreviewConfirmationService` phát token và lưu hash-only record trong
  `commandpreviews`. `CommandGuardService` reserve idempotency receipt, consume
  preview bằng conditional update trong cùng Mongo session, chạy business write,
  complete receipt/audit; cùng key completed replay trước kiểm tra expiry, key
  khác sau consume fail `PREVIEW_ALREADY_CONSUMED`. Business failure rollback
  preview consume và receipt.
- Operational guard: `ensure-command-guard-indexes.ts` dry-run/apply preflight
  duplicate preview ID/token hash và tạo bốn named indexes; không tự chạy apply
  trên cluster trong commit này. Production phải backup workspace, dry-run,
  apply + verify indexes, rồi fence old MCP writers/pods dùng token v1.
- Verification: backend `npm run validate` pass (171 tests, typecheck, lint,
  build); focused preview/guard tests pass; `git diff --check` sạch.
- Database impact: thêm model/index code cho `commandpreviews`. Backup/apply đã
  được thực hiện sau independent review; expiry là
  derived từ `expiresAt`, không ghi trạng thái EXPIRED trong command transaction.
- Residual: chưa có Mongo replica-set race test hai key, preview retention job,
  resource-version binding, trusted HITL receipt, failure-audit policy, browser
  one-time confirmation, reversal hoặc MCP payment mutation.
- Commit/push: `a41eae1` đã push thành công lên `origin/master`.

### Completed checkpoint: Command preview index rollout

- Target verified read-only trước mutation: context k8s-admin-public, namespace
  card-credit, backend pod card-credit-backend-68ffb6578f-6tzvq, image cũ
  a0e0b00a7515; không rollout/deploy pod trong bước này.
- Backup: workspace longhn0710-workspace được backup trước apply tại
  /tmp/card-credit-command-preview-backup/finance-longhn0710-workspace-2026-08-16T15-46-59.209Z.json,
  mode 600; counts commandreceipts=0, commandaudits=0.
- Dry-run preflight: duplicate receipt groups=0, duplicate preview groups=0,
  duplicate preview token groups=0; trước apply commandpreviews chưa tồn tại.
- Apply/post-verify: tạo và verify đủ 8 named indexes cho receipts, audits và
  previews; commandpreviews hiện tồn tại, bốn preview indexes đã được verify;
  duplicate counts sau apply vẫn bằng 0.
- Blast radius/rollback: chỉ additive collection/index metadata, không rewrite
  business rows. Nếu cần rollback trước khi có preview writer, drop đúng named
  indexes/collection mới sau preflight; không xóa receipt/audit khi đã có writer.
- Next gate: fence/drain pod cũ dùng token v1 trước khi deploy image có
  persistent preview writer; chưa mở MCP mutation mới hoặc rollout application.
- Runbook: `docs/mcp-preview-rollout.md`; hiện chưa scale/restart vì chưa có
  candidate image được user phê duyệt để thay pod cũ.

### Completed checkpoint: Legacy payment reconciliation inventory (read-only)

- Audit target: workspace longhn0710-workspace trên cùng cluster context; không
  có write, migration, index hoặc data rewrite.
- Evidence: 11 statements, 45 financial transactions, 7
  `STATEMENT_PAYMENT` transactions; 5 payment transactions khớp statement PAID
  và paidAmount, không có paid statement thiếu payment transaction.
- Mismatch cần user/database decision: 2 payment transactions còn trỏ tới
  statement `STATEMENT_CLOSED` hoặc `OPEN`, paidAmount=0. IDs và amounts đã
  được kiểm tra trong read-only audit nhưng chưa đưa vào docs để tránh lưu dữ
  liệu tài chính không cần thiết.
- Rollback/impact: chưa có mutation nên không cần rollback/backup bổ sung.
  Không mở payment reversal hoặc tự đánh dấu PAID trước khi chốt policy.

### Completed checkpoint: Legacy payment reconciliation planner and quarantine

- Independent review: GO có điều kiện sau khi planner chuyển sang strict
  eligibility/quarantine, target-set drift guard, source/plan hash và backup
  verification. Planner chỉ xác định full settlement an toàn; không tự mark
  `PAID`, không xóa hoặc reverse transaction. Review cũng xác nhận xóa script
  `sync-paid-statements-to-finance` vì audit live không còn missing payment
  transaction và script không có consumer khác.
- Changed write-set: `finance-reconciliation.ts` là pure deterministic planner;
  `reconcile-legacy-statement-payments.ts` hỗ trợ dry-run và explicit
  `quarantine`; `FinancialReconciliationCaseModel` lưu case theo workspace và
  transaction với unique index; mỗi case mới ghi `CommandAudit` trong cùng
  Mongo transaction. Chỉ các target ObjectId hợp lệ được ghi; ambiguity bị
  `QUARANTINE_REQUIRED` thay vì đoán.
- Verification: backend `npm run validate` pass (176/176 tests, typecheck,
  lint, build); focused reconciliation tests 4/4; plan dry-run trên workspace
  `longhn0710-workspace` cho `candidateCount=2`, `quarantineCount=0`,
  `sourceHash=70f6c43dce798ec8d520ab597e4ddb584b58b788c8ce50a1fd9ccc13b5b3df90`
  và `planHash=7793be9d7241f47dd854af3e74f07e48f5bd44cc23b3e61dd484855d3da7eb71`.
- Database/operations: context `k8s-admin-public`, namespace `card-credit`;
  backup private mode 600 tại
  `/tmp/card-credit-reconciliation-backup.3mBOnZ/finance-longhn0710-workspace-2026-08-16T16-16-22.540Z.json`,
  SHA-256
  `d82b133dd84635e309e03e2a47fc02cad36a2669984651c9da534b27770e8863`.
  Plan artifact private mode 600 tại
  `/tmp/card-credit-reconciliation-plan.3gj5eb/legacy-payment-plan.json`,
  SHA-256
  `8c52de4830a2bcef2bb0b962e1d938fee3cbf17b5b4cbb7d68dd3389cc0b7a70`.
  Quarantine apply tạo đúng 2 `financialreconciliationcases` với
  classification `ELIGIBLE_MARK_PAID` và 2 audit success; audit finance sau
  apply vẫn là 11 statements, 45 financial transactions, 5 paid statements,
  không có missing payment. Chạy lại cùng artifact/backup cho
  `appliedCaseCount=0`, không duplicate audit.
- Blast radius/rollback: chỉ thêm case/audit records và additive indexes;
  statement, payment transaction và account business fields không đổi. Rerun
  idempotent; rollback code là revert commit, rollback data chỉ xử lý case/audit
  theo case ID sau review, không xóa ledger. Cần fence/drain old writer trước
  explicit mark-paid vì planner đọc source trước transaction.
- Commit/push: `352481b` đã push thành công lên `origin/master`.

### Completed checkpoint: Guarded operator mark-paid for reviewed legacy cases

- Independent review: vòng đầu NO-GO vì full-workspace hash có nhiều candidate,
  thiếu `updatedAt` CAS và thiếu admin context. Đã sửa bằng target selection
  theo `case.statementId + transactionId`, `updatedAt` predicate, trusted
  `ServiceContext { channel: job, role: admin }`, impact canonical validation và
  fake-session test với 2 candidate.
- Changed write-set: `markLegacyStatementPaymentPaid` chạy qua
  `CommandGuardService` (receipt + audit success cùng transaction), yêu cầu
  case `OPEN/ELIGIBLE_MARK_PAID`, backup/plan artifact private + SHA, exact
  target, source/plan hash, expected status và idempotency key. Trong transaction
  chỉ update `CardStatement` sang `PAID`, resolve case và lưu `resolvedBy`; không
  tạo/xóa/sửa `FinancialTransaction` hoặc `Account`.
- Sequential review rebase: sau case đầu, full-workspace plan thay đổi vì
  statement đã `PAID`. Case thứ hai dùng current artifact/backup mới và giữ
  `reviewedSourceHash/reviewedPlanHash` cũ trong snapshot, đồng thời ghi
  current hashes; không bypass target recomputation.
- Live evidence: context `k8s-admin-public`, namespace `card-credit`, operator
  job `operator:reconciliation`. Case
  `6a81e25ea3bd695a66ad658e` (`OPEN`, amount `17042000`) và case
  `6a81e25ea3bd695a66ad658f` (`STATEMENT_CLOSED`, amount `11078000`) đều
  `APPLIED`; paidAt lấy đúng payment `createdAt`. Plan đầu có
  `sourceHash=70f6c43dce798ec8d520ab597e4ddb584b58b788c8ce50a1fd9ccc13b5b3df90`,
  `planHash=7793be9d7241f47dd854af3e74f07e48f5bd44cc23b3e61dd484855d3da7eb71`;
  plan sau case đầu có
  `sourceHash=72f947b9cdad4fa72e665160101ac335e37ef826dc812007f9bbf432a6920887`,
  `planHash=f6cc3cdc26eb0729b7da2956805e4598e991c321146090afb709d5b6d788b161`.
  Backup sau case đầu private mode 600 tại
  `/tmp/card-credit-reconciliation-backup-after-first.V6lDv9/finance-longhn0710-workspace-2026-08-16T16-30-23.935Z.json`,
  SHA-256 `a19eb101d35af2b89ef2128731eec29c15f323a98c58032a88fc14a9d6297da3`;
  current plan artifact private mode 600 tại
  `/tmp/card-credit-reconciliation-plan-after-first.85V9i4/legacy-payment-plan.json`,
  SHA-256 `99e314813f62c7fbea62112dffca0aa00b376a4adbdb4a8ad8caee5f2728c217`.
- Post-verify: finance audit là 11 statements, 7 paid statements, 45 financial
  transactions, 7 synced payments, `missingPayments=[]`; cả 2 cases `RESOLVED`,
  2 completed receipts và 2 success audits. Hai lần rerun cùng idempotency key
  không tăng receipt/audit count và không duplicate ledger.
- Rollback/impact: transaction rollback tự động khi CAS/case/audit fail; sau
  commit không dùng `REOPEN`, không xóa payment transaction. Code commits
  `ce35604`, `c1c9f8a`, `2f1feef` đã push lên `origin/master`. Còn phải fence
  old writer trước rollout image và mở reversal/MCP mutation theo slice riêng.

### Completed checkpoint: Canonical MCP statement payment preview/confirm

- Independent review: GO có điều kiện với các invariant: payload helper dùng
  chung REST/MCP, preview normalize theo `preview.version`, token bind
  workspace/user/channel/operation, confirm qua persistent guard và không direct
  model; production vẫn NO-GO cho tới khi fence/drain old MCP writer.
- Changed write-set: `payment-contract.ts` sở hữu `PAYMENT_OPERATION` và
  `paymentPreviewPayload({cardId, statementId, input})`, được REST payment route
  và MCP dùng chung. Manifest thêm `preview_pay_statement`/
  `confirm_pay_statement` với strict shared `StatementPaymentInput`, token,
  previewId và idempotency key. MCP preview gọi
  `StatementPaymentCommandService.preview`, issue hash-only `commandpreviews`
  metadata; confirm verify MCP HMAC token rồi gọi
  `StatementPaymentCommandService.execute` + `CommandGuardService`, sau đó đọc
  lại `StatementDto`. Không có MCP direct model, ledger formula, reverse hoặc
  payment transaction riêng.
- Verification: backend `npm run validate` pass (179/179 tests, typecheck,
  lint, build); focused MCP adapter/inventory 5/5; REST/MCP statement payment
  preview parity 4/4. Tests assert normalized `expectedVersion`, exact
  `previewPayloadHash`, preview metadata, operation inventory và canonical DTO.
- Database/operations: không migration/index/data write ngoài preview
  `commandpreviews` hiện hữu; preview không ghi statement/transaction/account.
  Confirm dùng receipt/audit/one-time preview guard cùng transaction theo service
  hiện có. Chưa deploy/rollout pod cũ.
- Residual/rollout: old MCP writer/token-v1 pod vẫn phải fence/drain trước
  candidate image; resource-version binding, trusted HITL receipt, failure-audit
  policy và reversal/compensating transaction vẫn là follow-up. Commit/push
  `7b0a042`, `3dafb9f`, `1044636` đã lên `origin/master`.

### Completed checkpoint: Browser trusted payment confirmation

- Independent review: GO sau khi sửa public MCP preview codec compatibility và
  strict preview metadata invariant. Review xác nhận browser/MCP domain tách biệt,
  payload/version/context binding, expiry/replay semantics, one-time consume và
  frontend dùng đúng metadata từ preview.
- Changed write-set: shared `StatementPaymentPreviewDto` thêm
  `previewId`/`confirmationToken`/`expiresAt`; shared execute schema bắt buộc
  metadata; REST payment preview phát hành hash-only `commandpreviews` record và
  response `Cache-Control: no-store`; PATCH verify browser HMAC domain riêng,
  bind card/statement/action/account/expectedVersion/context, rồi truyền
  `previewPayloadHash` vào generic guard. Browser service fail-closed khi thiếu
  preview metadata; MCP confirm cũng truyền canonical preview payload hash.
- Frontend: Cards, Payments và statements client chỉ gửi
  `preview.repaymentAccountId`, `preview.version`, `previewId` và token exact;
  không tự tính amount, không dùng account state mutable sau confirmation.
- Guard hardening: `CommandGuardService` reject mọi orphan/partial preview
  metadata; command receipt hash vẫn loại `expectedVersion` để retry cùng key
  không bị phá bởi CAS version. Token verify failure được map về
  `PREVIEW_NOT_AVAILABLE`, không lộ chi tiết cryptographic.
- Verification: focused backend 25/25 pass; backend full 172/172 pass
  (typecheck, lint, tests, build); shared 25/25 pass; frontend 84 unit + 6
  integration pass, typecheck/lint pass và production `next build` pass;
  `git diff --check` sạch.
- Database impact: không thêm migration/index mới trong slice này; dùng các
  `commandpreviews` indexes đã backup/apply/verify ở checkpoint trước. Preview
  metadata là write có side effect kỹ thuật nhưng không ghi business ledger.
- Residual/rollout: chưa có Mongo replica-set race test hai confirmation khác key,
  reversal/compensating transaction, hoặc MCP payment mutation. Old backend pod
  vẫn chưa được drain/deploy vì chưa có candidate image; không rollout trong
  commit này.
- Commit/push: `2dae679` đã push thành công lên `origin/master`.

### Completed checkpoint: Account contract registry

- Independent review: bounded scope được duyệt là `Ledger Account Read Contract +
  REST/MCP/Frontend parity`; không migration, không mở rộng mutation/audit.
- Changed write-set: `shared` runtime schema/type, Account REST input parsing,
  MCP account input schema, Account DTO serializer, Frontend account type và
  contract fixtures.
- Evidence: shared `validate` pass (3 tests), backend `validate` pass (65 tests
  và build), Frontend `typecheck`, `lint` và `test` pass (70 unit + 6
  integration).
- Residual risk: account create vẫn dùng mutation receipt cũ; confirmation
  replay/audit/context binding thuộc generic command guard, chưa được mở trong
  slice này. Cross-workspace service integration test cần bổ sung cùng trusted
  context foundation.
- Commit/push: `a54f09e` đã push thành công lên `origin/master`.

### Completed checkpoint: CREDIT Account Card Validation

- Independent review: bounded GAP-ACC-01 slice được duyệt; validation đặt trong
  `AccountService`, không thay đổi shared input schema, MCP manifest hoặc model.
- Changed write-set: `AccountService.create` kiểm tra `creditCardId` malformed,
  tồn tại, active và cùng `workspaceId` trước `AccountModel.create`; REST route
  dùng service nên nhận cùng behavior; idempotency replay trả receipt trước card
  lookup. CREDIT không có card link vẫn được giữ hợp lệ.
- Acceptance evidence: 5 account service tests pass, gồm active same-workspace,
  missing/inactive/cross-workspace, malformed id, non-CREDIT boundary và replay;
  backend typecheck/lint pass.
- Residual risk: card có thể bị deactivate/delete giữa read validation và
  account write; transaction/locking và card lifecycle policy cần decision riêng.
- Database impact: chỉ thêm read validation trước write, không migration/index/
  data change và không cần Kubernetes backup.
- Commit/push: `3729786` đã push thành công lên `origin/master`.

### Completed checkpoint: Trusted ServiceContext (ready to commit)

- Independent review: `channel` và `correlationId` phải là required fields; MCP
  cần correlation ID mới cho từng invocation, không dùng một ID startup.
- Changed write-set: `backend/src/context.ts`, `ServiceContext` types, browser
  service route adapters, MCP context/tool invocation provider và context tests.
- Acceptance evidence: role/channel/correlation validation, browser signed
  session derivation, job factory và MCP correlation uniqueness đều có test;
  backend `validate` pass (67 tests và build), không còn service route truyền
  trực tiếp `sessionFromRequest`.
- Residual risk: session chưa revalidate user active/role/workspace mỗi request;
  MCP fixed identity chưa kiểm tra active user/workspace từ repository. Đây là
  checkpoint kế tiếp của Access & Tenancy, chưa phải security completion.
- Commit/push: `12ba6ed` đã push thành công lên `origin/master`.

### Completed checkpoint: Identity revalidation (ready to commit)

- Browser service adapters nhận optional trusted auth repository trong production
  wiring; user không tồn tại, inactive, locked hoặc đổi workspace đều fail closed.
- MCP giữ fixed `MCP_USER_ID`/`MCP_WORKSPACE_ID`, nhưng revalidate user và
  workspace trước từng tool invocation; mỗi invocation có correlation ID mới.
- Call-sites của Account, Finance, Report, Transaction, Recurring Expense và
  statement payment dùng async browser context factory; không đổi business query
  hoặc persistence.
- Evidence: backend `validate` pass (69 tests và build), gồm browser inactive/
  moved-user và MCP workspace revalidation tests.
- Residual risk: các private direct-model routes chưa chuyển hết sang service
  context; cookie/session expiry/version và full user revalidation middleware
  vẫn là phần còn lại của Access & Tenancy.
- Database impact: read-only user lookup; không migration/index/write, không cần
  Kubernetes backup.
- Commit/push: `bccd9b1` đã push thành công lên `origin/master`.

### Completed checkpoint: Signed session expiry (ready to commit)

- Independent review: dùng absolute expiry, `issuedAt` bắt buộc, reject timestamp
  thiếu/sai/quá tương lai và cookie cũ; mặc định 8 giờ, cấu hình được qua
  `AUTH_SESSION_MAX_AGE_MS` trong giới hạn 1 phút–30 ngày.
- Changed write-set: `backend/src/auth.ts`, `auth-routes.ts`, `config.ts`,
  `server.ts` và auth/catalog/config tests; cookie login/register nhận `Max-Age`
  nhưng server-side `issuedAt` check là nguồn quyết định.
- Acceptance evidence: backend `npm run validate` pass (70 tests, typecheck,
  lint và build); test mới bao phủ expired/future sessions và fixture cũ đã
  chuyển sang signed session hợp lệ.
- Operational impact: cookie không có `issuedAt` hoặc quá hạn sẽ yêu cầu đăng
  nhập lại; không có thay đổi schema/index/migration hay ghi DB.
- Residual risk: chưa có session version/revocation tức thời và một số private
  direct-model route chưa qua service context.
- Commit/push: `26fc471` đã push thành công lên `origin/master`.

### Completed checkpoint: Canonical MCP tool manifest (ready to commit)

- Independent review: bounded scope chỉ xử lý MCP inventory drift; có 10 tool
  thực tế và loại 4 tên stale khỏi `x-mcp`, không mở rộng sang REST inventory.
- Changed write-set: metadata-only `backend/src/mcp/manifest.ts`, MCP
  registration metadata, OpenAPI `x-mcp` projection và manifest tests; không
  import model/database, không đổi business handler behavior.
- Manifest ghi tên, description, `query|preview|confirm`, operation và Zod
  input schema; preview/confirm pairs được kiểm tra cùng operation, schema không
  nhận `userId`, `workspaceId` hoặc `role`.
- Acceptance evidence: backend `npm run validate` pass (72 tests, typecheck,
  lint và build); InMemoryTransport `tools/list` khớp chính xác manifest và
  docs projection dùng cùng source.
- Database impact: không schema/index/migration/write, không cần Kubernetes
  backup.
- Residual risk: REST endpoint inventory vẫn còn khai báo thủ công; generic
  preview/confirm/idempotency/audit guard chưa được chuẩn hóa.
- Commit/push: `7291138` đã push thành công lên `origin/master`.

### Completed checkpoint: Catalog read contract (ready to commit)

- Independent review: public catalog read là bounded scope; giữ Mongo
  `CatalogRepository` làm runtime authority, không mở catalog MCP tool và không
  đụng admin mutation/startup sync.
- Changed write-set: shared Zod/runtime schemas và DTO types cho
  `CatalogProductDto`/`CatalogProviderDto`, backend public catalog response
  parsing, frontend catalog types/client runtime parsing và shared contract
  fixture.
- Compatibility retained: `GET /api/card-catalog/providers` và products vẫn
  bọc `{data}`, normalize provider uppercase, chỉ trả active product và trả
  `404 PROVIDER_NOT_FOUND`; frontend picker tiếp tục nhận cùng canonical DTO.
- Acceptance evidence: shared `npm run validate` pass (4 tests), backend
  `npm run validate` pass (72 tests, typecheck, lint, build), frontend
  `npm run typecheck`, `npm run lint`, `npm test` pass (70 unit + 6 integration).
- Database impact: chỉ đọc repository trong request; không schema/index/migration
  hoặc write, không cần Kubernetes backup.
- Residual risk: Card CRUD/`compare_cards` vẫn chưa dùng cùng Card DTO/service;
  catalog admin output còn compatibility aliases. Startup sync risk GAP-OPS-01
  đã đóng bằng cách tách import thành CLI operator-controlled.
- Commit/push: `b0a74da` đã push thành công lên `origin/master`.

### Completed checkpoint: Card Portfolio read parity (ready to commit)

- Independent review: list phải giữ inactive history; compare chỉ active-only;
  không đổi REST envelope/`_id` public contract và không tự mở catalog MCP tool.
- Changed write-set: shared `CardDto`/monthly card schemas; backend
  `CardQueryService.list/get/compare`, REST GET adapters và trusted browser
  context wiring; MCP `compare_cards` delegate; frontend card client runtime
  parse + compatibility normalization.
- Canonical behavior: mọi query scope theo `workspaceId`; REST list/get và MCP
  compare dùng cùng normalized business fields; compatibility adapter giữ array,
  `_id`, `bank/name/type` aliases cho consumer hiện hữu.
- Acceptance evidence: backend `npm run validate` pass (73 tests, typecheck,
  lint và build), targeted card DTO parity test pass; shared validate pass (5
  tests); frontend typecheck, lint và test pass (70 unit + 6 integration).
- Database impact: chỉ đọc `CreditCardModel` theo workspace, không schema/index/
  migration/write, không cần Kubernetes backup.
- Residual risk: card create/update/delete/duplicate merge vẫn trực tiếp ở route;
  referential policy và mutation command guard chưa mở trong slice này.
- Commit/push: `c39ff5c` đã push thành công lên `origin/master`.

### Completed checkpoint: Card create/update command boundary (ready to commit)

- Independent review: service hóa create/update trước; không đổi destructive
  delete/merge semantics vì `GAP-DATA-01` còn orphan risk. Delete/merge phải
  chờ quyết định RESTRICT/REASSIGN/CASCADE hoặc ghi nhận AS-IS riêng.
- Changed write-set: `CardCommandService` với `ServiceContext` bắt buộc,
  catalog/card repository seams và route adapters; create/update không còn gọi
  Mongoose trực tiếp trong adapter. Legacy create giữ deprecation header và
  canonical create snapshot vẫn lấy từ active catalog.
- Acceptance evidence: backend `npm run validate` pass (76 tests, typecheck,
  lint và build), gồm 3 command unit tests và card route compatibility tests;
  canonical owner normalization, trusted workspace/user, operational allowlist
  và cross-workspace 404 được kiểm tra.
- Database impact: refactor code path cho existing card writes, không model/
  index/migration change và không chạy mutation trên DB thật; không cần backup
  Kubernetes cho commit này.
- Residual risk/blocker: delete/merge vẫn là legacy direct-model path, merge có
  hai write rời và chưa transaction/idempotency. Không mở card mutation qua MCP.
- Commit/push: `514e6e9` đã push thành công lên `origin/master`.

### Completed checkpoint: Card Duplicate Read Contract Parity

- Independent review: chỉ mở GET duplicate detection; giữ nguyên merge/delete
  direct-model behavior và defer `RESTRICT/REASSIGN/CASCADE` lifecycle policy.
- Scope: shared `CardDuplicateGroupDto` canonicalizes grouped cards; pure
  duplicate fingerprint/owner normalization dùng chung với merge guard;
  `CardQueryService.listDuplicates` scopes workspace, giữ inactive history và
 sort oldest-first; REST/frontend adapters chỉ map legacy card aliases.
- Acceptance evidence: shared validate pass (13 tests); backend full
  `npm run validate` pass (106 tests + build); frontend typecheck/lint/full
  tests pass (74 unit + 6 integration) và production build pass; duplicate
  service/REST/parser tests cover workspace, ordering, inactive card và
  normalized owner.
- Database impact: chỉ đọc `CreditCardModel` theo workspace; không schema/
  index/migration/data write, không cần Kubernetes backup.
- Residual risk: toàn workspace scan/in-memory grouping chưa pagination; merge
  và delete vẫn hai write/legacy path, chưa transaction/idempotency/cascade.
- Commit/push: `9c8f6e3` đã push thành công lên `origin/master`.

### Completed checkpoint: MCP Duplicate Read Parity

- Independent review: bounded query-only slice được duyệt; tool không nhận
  tenant/user/role, không có `operation`, preview hay confirm. Merge/delete vẫn
  là legacy card lifecycle path và không được expose qua MCP.
- Changed write-set: MCP manifest thêm `list_duplicate_cards`; handler là thin
  adapter gọi `CardQueryService.listDuplicates` với invocation context đã
  revalidate; SRS/README cập nhật inventory. Output là JSON text chứa
  `CardDuplicateGroupDto[]` canonical, không trả Mongoose document.
- Acceptance evidence: MCP inventory và `tools/list` parity vẫn pass; focused
  test kiểm tra workspace/user/channel/correlation và exact DTO delegation;
  backend `npm run validate` pass (107 tests + build), `git diff --check` pass.
- Database impact: chỉ đọc cards trong workspace qua service hiện có; không
  schema/index/migration/data write, không cần Kubernetes backup.
- Residual risk: tool scan toàn workspace và group in-memory, chưa pagination/
  limit; `fingerprint` vẫn giữ workspace prefix để parity nhưng không expose
  field tenant riêng. Card merge/delete còn hai-write legacy, chưa
  transaction/idempotency/cascade.
- Commit/push: `318ba16` đã push thành công lên `origin/master`.

### Completed checkpoint: Trusted Private Read Adapter Coverage

- Independent review: bounded security slice được duyệt; không mở session
  version/revocation vì đó là DB policy gate. Chỉ chuyển bốn private GET qua
  trusted context và giữ nguyên response compatibility.
- Changed write-set: `/api/auth/me`, `/api/profile`, `/api/workspace/owner` và
  `/api/notes` GET gọi `browserServiceContext` với `AuthRepository` bắt buộc;
  production runtime wiring truyền repository, còn profile/workspace/notes
  mutation giữ nguyên behavior và envelope.
- Acceptance evidence: auth/me inactive-user, profile/workspace moved-user và
  downstream-read isolation tests; notes workspace fixture cập nhật; backend
  `npm run validate` pass (108 tests + build), focused private tests pass,
  `git diff --check` pass.
- Database impact: chỉ revalidate user read và workspace owner read hiện có;
  không schema/index/migration/data write, không cần Kubernetes backup.
- Residual risk: mỗi private GET thêm một user lookup; session version,
  immediate revocation và các private mutation/direct-model routes còn lại
  chưa được chuẩn hóa.
- Commit/push: `8a75e3c` đã push thành công lên `origin/master`.

### Completed checkpoint: Auth session actor boundary

- Requirement/GAP: `/api/auth/me` đã revalidate browser session nhưng đọc lại
  cùng user lần hai; cần một authoritative actor result để route không tự
  compose identity từ context và repository lần nữa.
- Independent review: route dùng `browserActorContext`, giữ active/locked/
  workspace/session-version guard và chỉ serialize actor đã được revalidate;
  cookie email/role không được tin, còn workspace mismatch vẫn fail closed.
- Changed write-set: `auth-routes.ts` bỏ lookup thứ hai; regression test chứng
  minh authoritative response và đúng một `findUserById` lookup.
- Acceptance evidence: focused auth/context tests pass `10/10`; backend
  `npm run validate` pass `117/117` với typecheck, lint và build; `git diff --check`
  pass.
- Database/operational impact: chỉ đọc user hiện có, không persistence/schema/
  index/migration/data rewrite và không Kubernetes mutation.
- Residual risk: register/reset/bootstrap và các auth persistence policies vẫn
  là boundary riêng; session version/revocation runtime evidence còn GAP P0.
- Commit/push: source commit `7a3ccdf` và checkpoint này được push cùng batch;
  không chờ runtime rollout trong batch local.

### Completed checkpoint: AuthSessionService login boundary

- Requirement/GAP: login route còn giữ credential lookup, active/locked guard,
  password verification và `touchLogin`; cần canonical application boundary mà
  không đổi cookie, audit, response hoặc persistence semantics.
- Independent review: `AuthSessionService.login` nhận normalized email/password,
  chỉ dùng `findUserByEmail`/`touchLogin`, fail closed cho user không tồn tại,
  inactive, locked hoặc sai password; route chỉ gọi service rồi map session,
  audit và cookie.
- Changed write-set: thêm `backend/src/services/auth-session-service.ts`, route
  bỏ local authenticate function; curated backend thêm
  `tests/auth-session-service.test.ts`.
- Acceptance evidence: focused auth/service tests pass `7/7`; backend
  `npm run validate` pass `119/119` với typecheck, lint và build; `git diff --check`
  pass.
- Database/operational impact: giữ nguyên `touchLogin` persistence call, không
  schema/index/migration/data rewrite và không Kubernetes mutation.
- Residual risk: register/reset/bootstrap auth persistence còn direct route
  boundaries; session version/revocation runtime evidence vẫn là GAP P0.
- Commit/push: source commit `1983b23` đã tạo; checkpoint này sẽ được push cùng
  docs-only commit, không chờ runtime rollout trong batch local.

### Completed checkpoint: AuthRegistrationService boundary

- Requirement/GAP: register route còn chứa email/password validation,
  duplicate check, first-user admin policy, personal workspace derivation,
  password hashing và `createUser`; cần application boundary nhưng giữ nguyên
  registration policy, cookie/audit/response và repository write semantics.
- Independent review: `AuthRegistrationService.register` nhận normalized email,
  raw password/display name và canonical repository subset; fail closed trước
  create cho invalid email/password hoặc duplicate email; first user vẫn là
  `admin`, workspace vẫn deterministic `personal-<sha256-prefix>`.
- Changed write-set: thêm `backend/src/services/auth-registration-service.ts`,
  route giữ policy cấm client chọn `workspaceId` rồi delegate; curated backend
  thêm `tests/auth-registration-service.test.ts`.
- Acceptance evidence: focused auth/registration tests pass `9/9`; backend
  `npm run validate` pass `121/121` với typecheck, lint và build; `git diff --check`
  pass.
- Database/operational impact: giữ nguyên `createUser` persistence call, không
  schema/index/migration/data rewrite và không Kubernetes mutation.
- Residual risk: forgot/reset/bootstrap auth persistence còn direct route
  boundaries; session version/revocation runtime evidence vẫn là GAP P0.
- Commit/push: source commit `35dcf51` đã tạo; checkpoint này sẽ được push
  cùng docs-only commit, không chờ runtime rollout trong batch local.

### Completed checkpoint: PasswordResetService boundary

- Requirement/GAP: reset-password route còn chứa token lookup, active/locked
  validation, password hashing, `updatePassword` và `consumeResetTokens`; cần
  application boundary nhưng giữ nguyên token/password error semantics, audit,
  cookie behavior và persistence calls.
- Independent review: `PasswordResetService.complete` validates password and
  token before writes, hashes the new password, rejects missing/expired tokens
  and inactive/locked users, then performs the existing update/consume calls.
  The route remains responsible only for audit, cookie clearing and response.
- Changed write-set: thêm `backend/src/services/password-reset-service.ts`,
  route delegates reset completion and reuses the extracted token hash;
  curated backend thêm `tests/password-reset-service.test.ts`.
- Acceptance evidence: focused auth/reset tests pass `7/7`; backend
  `npm run validate` pass `123/123` với typecheck, lint và build; `git diff --check`
  pass.
- Database/operational impact: giữ nguyên `updatePassword` và
  `consumeResetTokens` persistence calls, không schema/index/migration/data
  rewrite và không Kubernetes mutation.
- Residual risk: forgot-password token issuance/mail và bootstrap vẫn là
  direct auth route boundaries; session version/revocation runtime evidence vẫn
  là GAP P0.
- Commit/push: source commit `72292f4` đã tạo; checkpoint này sẽ được push
  cùng docs-only commit, không chờ runtime rollout trong batch local.

### Completed checkpoint: ForgotPasswordService boundary

- Requirement/GAP: forgot-password route còn chứa user lookup, reset token
  generation/hash/persistence, reset-link composition, SMTP delivery handling
  và generic response mapping; cần application boundary mà không đổi
  enumeration-safe response hoặc audit delivery flag.
- Independent review: `ForgotPasswordService.request` normalizes and validates
  email, creates a random one-way token only for active/unlocked users, keeps
  unknown/locked users generic, preserves the 30-minute TTL and converts mail
  failure to `delivered=false`; route chỉ giữ forwarded-host/proto adaptation,
  audit và response envelope.
- Changed write-set: service owns forgot-password repository/mail seams; route
  delegates; regression tests cover normalized email, hashed token, generic
  response, locked/unknown user and invalid email behavior.
- Acceptance evidence: focused auth/reset tests pass `9/9`; backend
  `npm run validate` pass `125/125` với typecheck, lint và build; `git diff --check`
  pass.
- Database/operational impact: giữ nguyên `createResetToken` persistence call,
  không schema/index/migration/data rewrite và không Kubernetes mutation.
- Residual risk: bootstrap user provisioning vẫn là direct auth route boundary;
  session version/revocation runtime evidence vẫn là GAP P0; SMTP delivery vẫn
  cần production monitoring/evidence.
- Commit/push: source commit `74b03ff` đã push; checkpoint này sẽ được push
  cùng docs-only commit, không chờ runtime rollout trong batch local.

### Completed checkpoint: AuthBootstrapService boundary

- Requirement/GAP: bootstrap-users route còn chứa cấu hình user validation,
  password hashing, role/workspace/display-name normalization và `upsertUser`;
  cần application boundary, trong khi bearer gate và operator-only semantics
  vẫn ở route.
- Independent review: `AuthBootstrapService.run` giữ nguyên configured
  `passwordHash` passthrough hoặc scrypt hashing, role default, workspace and
  display-name mapping, active/locked mapping và repository upsert behavior;
  route chỉ xác thực bootstrap token, gọi service, map safe session DTO và audit.
- Changed write-set: thêm `backend/src/services/auth-bootstrap-service.ts`,
  route delegate và curated regression `tests/auth-bootstrap-service.test.ts`.
- Acceptance evidence: focused auth/bootstrap/reset tests pass `11/11`; backend
  `npm run validate` pass `127/127` với typecheck, lint và build; `git diff --check`
  pass.
- Database/operational impact: giữ nguyên `upsertUser` persistence call, không
  chạy bootstrap trên môi trường thật, không schema/index/migration/data rewrite
  và không Kubernetes mutation.
- Residual risk: bootstrap vẫn cần external operator/configuration governance;
  session version/revocation runtime evidence vẫn là GAP P0; old MCP writer
  fence/drain và financial reversal decision không bị thay đổi.
- Commit/push: source commit `2034060` đã push; checkpoint này sẽ được push
  cùng docs-only commit, không chờ runtime rollout trong batch local.

### Completed checkpoint: Shared auth input policy

- Requirement/GAP: registration, bootstrap và password-reset từng tự định nghĩa
  `validEmail`/`requirePassword`; bootstrap còn import policy từ password-reset
  service, làm boundary phụ thuộc sai hướng và cho phép drift error semantics.
- Independent review: `auth-policy.ts` là primitive duy nhất cho email
  normalization/validation và password validation; các service chỉ import
  policy, không đổi route envelope, auth error code, hashing hoặc repository
  call.
- Changed write-set: thêm `backend/src/services/auth-policy.ts`, xóa duplicate
  helpers khỏi registration/password-reset, đổi bootstrap import và thêm
  `tests/auth-policy.test.ts` vào curated backend suite.
- Acceptance evidence: focused auth/policy tests pass `15/15`; backend
  `npm run validate` pass `129/129` với typecheck, lint và build; `git diff --check`
  pass.
- Database/operational impact: pure application validation refactor, không
  persistence/schema/index/migration/data rewrite và không Kubernetes mutation.
- Residual risk: session version/revocation runtime evidence, card lifecycle
  policy, external MCP writer fence/drain và financial reversal decision vẫn mở.
- Commit/push: source commit `a212056` đã push; checkpoint này sẽ được push
  cùng docs-only commit, không chờ runtime rollout trong batch local.

### Completed checkpoint: Auth adapter email normalization cleanup

- Requirement/GAP: sau khi có `auth-policy`, `auth-routes` và
  `AuthBootstrapService` vẫn giữ helper normalize email riêng, tạo thêm điểm
  drift giữa public auth adapters và service policy.
- Independent review: login/register route và bootstrap service đều gọi cùng
  `normalizeEmail`; invalid/blank/trimmed/lowercase behavior giữ nguyên, không
  thay đổi authorization, response envelope hoặc repository semantics.
- Changed write-set: xóa hai local helpers và đổi import sang
  `backend/src/services/auth-policy.ts`; không thêm persistence path.
- Acceptance evidence: focused auth/policy tests pass `15/15`; backend
  `npm run validate` pass `129/129` với typecheck, lint và build; `git diff --check`
  pass.
- Database/operational impact: pure adapter cleanup, không persistence/schema/
  index/migration/data rewrite và không Kubernetes mutation.
- Residual risk: remaining card lifecycle direct writes and session/runtime,
  old-writer and financial decision gates remain unchanged.
- Commit/push: source commit `7743db0` đã push; checkpoint này sẽ được push
  cùng docs-only commit, không chờ runtime rollout trong batch local.

### Verification checkpoint: Cross-package validation after auth boundary batches

- Scope: xác nhận các batch auth boundary gần nhất không làm lệch shared
  contract, backend curated suite hoặc frontend consumer/build; đây là local
  source/test evidence, không phải candidate runtime evidence.
- Acceptance evidence: `frontend npm ci --include=optional` pass; shared
  `npm run validate` pass `25/25`; backend `npm run validate` pass `127/127`
  với typecheck, lint và build; frontend `npm run test:unit` pass `86/86`,
  `npm run test:integration` pass `6/6`, typecheck/lint và production build
  pass.
- Review note: Next.js chỉ phát cảnh báo convention `middleware` deprecated;
  không có test/build failure và chưa đổi convention trong batch này.
- Operational impact: chỉ local validation, không Jenkins trigger thủ công,
  không Argo sync/refresh, không Kubernetes mutation, không database hoặc
  financial persistence change.
- Residual risk: candidate image/GitOps handoff và old MCP statement-payment
  writer fence/drain vẫn cần evidence riêng; không claim production rollout.

### Completed checkpoint: REST route service-boundary guard

- Requirement/GAP: canonical architecture yêu cầu REST adapters không query
  Mongoose/model trực tiếp; cần regression guard để ngăn route mới quay lại
  trở thành business source thứ hai, đồng thời không che giấu card lifecycle
  exception đang chờ policy.
- Independent review: static inventory của mọi `*-routes.ts` chỉ tìm thấy
  `card-routes.ts` có direct model dependency; route này được giữ nguyên và
  ghi nhận là policy-gated exception, không giả vờ đã đóng delete/merge GAP.
- Changed write-set: thêm `tests/route-boundary.test.ts` vào curated backend
  suite; không đổi runtime route, model, persistence hoặc public contract.
- Acceptance evidence: focused route/card/inventory tests pass `6/6`; backend
  `npm run validate` pass `130/130` với typecheck, lint và build; `git diff --check`
  pass.
- Database/operational impact: test-only architecture guard, không persistence/
  schema/index/migration/data rewrite và không Kubernetes mutation.
- Residual risk: card delete/merge vẫn cần RESTRICT/REASSIGN/CASCADE policy,
  dry-run/backup/rollback và atomic command design trước khi sửa.
- Commit/push: source commit `89e3091` đã push; checkpoint này sẽ được push
  cùng docs-only commit, không chờ runtime rollout.

### Completed checkpoint: Calendar feed composition service boundary

- Requirement/GAP: calendar feed route vẫn tự phối hợp card/statement query,
  map business fields và dựng calendar input; cần một application boundary cho
  REST adapter mà không đổi token, feed content, headers hoặc scope.
- Independent review: `CalendarSubscriptionService.feed` dùng cùng
  `CardQueryService.list` và `StatementQueryService.listForCardIds`, giới hạn
  theo trusted job context, bỏ orphan card khỏi feed và serialize bằng cùng
  `serializePaymentDueFeed`; route chỉ giữ token context, headers và response.
- Changed write-set: chuyển feed composition khỏi
  `calendar-subscription-routes.ts`, thêm service delegation regression; không
  đổi model/query semantics hoặc public `.ics` contract.
- Acceptance evidence: focused calendar/route-boundary tests pass `10/10`;
  backend `npm run validate` pass `131/131` với typecheck, lint và build;
  `git diff --check` pass.
- Database/operational impact: read-only application boundary, không
  persistence/schema/index/migration/data rewrite và không Kubernetes mutation.
- Residual risk: calendar unique-index policy và delivery/retry observability
  vẫn là GAP riêng; external MCP writer/payment/reversal gates không thay đổi.
- Commit/push: source commit `523fcc5` đã push; checkpoint này sẽ được push
  cùng docs-only commit, không chờ runtime rollout.

### Completed checkpoint: Statement calendar email service boundary

- Requirement/GAP: statement calendar email route còn tự lấy Card/Statement,
  dựng calendar projection, gửi mail và map provider errors; cần application
  boundary nhưng phải giữ authoritative recipient, masked response, safe error
  mapping và log behavior.
- Independent review: `StatementCalendarEmailService.send` nhận trusted
  context, normalizes/validates actor email, delegates canonical card/statement
  reads, composes the existing calendar payload and maps only known mail errors;
  route giữ authentication/log/header/response adapter behavior.
- Changed write-set: thêm service, route delegate và curated
  `tests/statement-calendar-email-service.test.ts`; không đổi email template,
  calendar projection, database query semantics hoặc persistence.
- Acceptance evidence: focused service/route/transaction tests pass `12/12`;
  backend `npm run validate` pass `133/133` với typecheck, lint và build;
  `git diff --check` pass.
- Database/operational impact: read-only query composition plus existing SMTP
  side effect boundary, không schema/index/migration/data rewrite và không
  Kubernetes mutation.
- Residual risk: SMTP production delivery/retry observability remains a runtime
  gate; payment/reversal and external MCP writer decisions remain unchanged.
- Commit/push: source commit `98ca53f` đã push; checkpoint này sẽ được push
  cùng docs-only commit, không chờ runtime rollout.

### Completed checkpoint: Centralize monthly cashback year validation

- Requirement/GAP: monthly cashback REST route lặp lại validation `year` trong
  khi `MonthlyCashbackQueryService` là nguồn dùng chung cho REST và MCP; cần
  giữ route như thin adapter mà không đổi public error contract.
- Independent review: route chỉ tạo trusted context và delegate; service nhận
  `unknown`, validate canonical `YYYY`, giữ `INVALID_YEAR` cùng error detail,
  rồi mới kiểm tra card và đọc cashback. Route inventory vẫn chỉ có
  `card-routes.ts` là direct-model exception policy-gated.
- Changed write-set: xóa `validYear` khỏi
  `monthly-card-cashback-routes.ts`, đưa validation/normalized year vào
  `monthly-cashback-query-service.ts`, cập nhật route regression. Không đổi
  DTO, query scope, REST/MCP response, persistence hoặc command behavior.
- Acceptance evidence: focused monthly cashback/query tests pass `10/10`;
  backend `npm run validate` pass `133/133` với typecheck, lint và build;
  `git diff --check` pass.
- Database/operational impact: read-only service-boundary cleanup, không
  schema/index/migration/data write, không scale/restart/patch Kubernetes,
  không MCP mutation và không reversal/compensating transaction.
- Residual risk: session-version runtime evidence, external old-writer
  fence/drain, card delete/merge policy và financial/reversal decisions vẫn
  mở; production MCP statement-payment writer rollout tiếp tục **NO-GO**.
- Commit/push: source commit `71dfa58` và docs checkpoint `45a7ed9` đã được
  push lên `origin/master`.

### Completed checkpoint: Reuse shared email validation for calendar mail

- Requirement/GAP: statement calendar email service duplicated the email regex
  already owned by `auth-policy`; consolidate the non-financial engagement
  validation primitive without changing the mail error contract.
- Independent review: service now imports `validEmail` from `auth-policy`,
  keeps trimming/lower-casing and `ACCOUNT_EMAIL_UNAVAILABLE`, and still
  rejects invalid recipients before card/statement reads. No route/model
  dependency or calendar payload changed.
- Changed write-set: remove the local regex and extend the calendar-email
  regression with whitespace/case normalization. No persistence, schema,
  index, financial command, Kubernetes or MCP writer change.
- Acceptance evidence: focused calendar-email/auth-policy tests pass `4/4`;
  backend `npm run validate` passes `133/133` with typecheck, lint and build;
  `git diff --check` passes.
- Residual risk: session-version runtime evidence, external old-writer
  fence/drain, card delete/merge policy and financial/reversal decisions remain
  open; production MCP statement-payment writer rollout remains **NO-GO**.
- Commit/push: source commit `51d3a79` và execution-plan checkpoint `74aa876`
  đã được push lên `origin/master`.

### Completed checkpoint: Bound calendar subscription list reads

- Requirement/GAP: `GAP-PERF-01` còn mở cho calendar subscription management
  list; query trước đây đọc toàn bộ user/workspace rows dù response chỉ cần
  metadata mới nhất.
- Independent review: `CalendarSubscriptionService.list` giữ nguyên trusted
  user/workspace filter, `createdAt DESC`, safe DTO và `{data: [...]}` envelope;
  service clamps requested `limit` to `1..100` and applies `.limit()` before
  `.lean()`. Feed token, `lastAccessedAt`, create/revoke and all write paths are
  unchanged.
- Changed write-set: REST GET nhận optional `limit`, default/max `100`, API docs
  cập nhật; added service and route regression tests. No cursor contract is
  claimed, and no persistence/schema/index/data change was made.
- Acceptance evidence: calendar subscription focused tests pass `10/10`;
  backend `npm run validate` passes `134/134` with typecheck, lint and build;
  `git diff --check` passes.
- Database/operational impact: bounded read-only query only; no MCP mutation,
  no financial persistence, no reversal/compensating transaction and no
  Kubernetes mutation.
- Residual risk: cursor pagination for larger datasets, session-version
  runtime evidence, external old-writer fence/drain, card delete/merge policy
  and financial/reversal decisions remain open.
- Commit/push: source/API commit `4acd3ea` pushed; this checkpoint is pending
  the next execution-plan/SRS docs commit.

### Completed checkpoint: Monthly Cash-flow Read Contract Parity

- Independent review: bounded extraction-only slice được duyệt; giữ nguyên
  Financial Domain joins/formulas, không tự sửa reimbursement/refund semantics
  và không thêm fee/cashback sources vào cash-flow.
- Changed write-set: shared `MonthlyCashFlowRowDto`/response schema; backend
  `CashFlowQueryService` scope workspace, validate `period`/`cardId`, map
  credit-account và statement-payment joins; REST adapter giữ `{data,period}`
  và legacy `bank/name` aliases; frontend runtime parser dùng shared schema.
- Acceptance evidence: shared `validate` pass (14 tests); backend full
  `npm run validate` pass (111 tests + build); frontend typecheck/lint/full
  tests pass (76 unit + 6 integration) và production build pass; focused
  service/route/parser tests cover isolation, formula, zero rows và invalid
  period.
- Database impact: chỉ đọc CreditCard/Account/Statement/FinancialTransaction
  collections; không schema/index/migration/data write, không cần backup DB.
- Residual risk: `partnerReturns` chưa follow `reimbursementForTransactionId`
  về expense CREDIT khi return nằm ở DEBIT; chưa pagination và chưa có MCP
  cash-flow tool. Semantic repair/filter contract là decision slice riêng.
- Commit/push: `7186e38` đã push thành công lên `origin/master`.

### Completed checkpoint: MCP Monthly Cash-flow Read Parity

- Independent review: query-only MCP exposure được duyệt; input chỉ có
  `period?` và `cardId?`, không nhận tenant/user/role, không operation và không
  mutation confirmation.
- Changed write-set: manifest thêm `get_monthly_cash_flow`; MCP handler delegate
  cùng `CashFlowQueryService.list` và trả `MonthlyCashFlowResponseDto` dưới dạng
  JSON text; SRS/README cập nhật inventory. Không tạo công thức hoặc query
  riêng cho MCP.
- Acceptance evidence: `MCP_TOOL_INVENTORY == tools/list == x-mcp` parity;
  focused test kiểm tra trusted workspace/channel/correlation, exact response,
  malformed period/card fail-closed; period validation loại năm `0000` trước
  khi tính range; backend full `npm run validate` pass (112 tests + build),
  shared/frontend focused contract tests pass và `git diff --check` pass.
- Database impact: không thêm read path ngoài service hiện có; không schema/
  index/migration/data write, không cần Kubernetes backup.
- Residual risk: tool vẫn trả tập card theo tháng không pagination; cash-flow
  semantic repair và owner/card/date filter contract vẫn là decision slices
  riêng; không có MCP write.
- Commit/push: feature `184b397` và validation hardening `00c997a` đã push thành
  công lên `origin/master`.

### Completed checkpoint: REST/MCP Contract Parity Guard

- Independent review: test-only vertical slice được duyệt để đóng INT-04/INT-09;
  không thay đổi business formula, model hay persistence.
- Changed write-set: `backend/tests/rest-mcp-contract-parity.test.ts` dùng cùng
  canonical service fixture cho REST và InMemory MCP, parse sau compatibility
  adapter bằng shared schemas cho cash-flow, duplicate cards, fee payments,
  Fee Center và monthly cashback. Trong quá trình test phát hiện và sửa REST
  Fee Center adapter không truyền field `undefined`, để options parity với MCP.
- Acceptance evidence: cùng fixture sau parse `deepEqual`; kiểm tra trusted
  workspace/context, filter/options và service delegation hai adapter; backend
  full `npm run validate` pass (115 tests + build), `git diff --check` pass.
- Database impact: test/mock và adapter-option cleanup chỉ; không schema/index/
  migration/data write, không cần Kubernetes backup.
- Residual risk: guard chứng minh adapter/DTO parity, chưa chứng minh semantic
  formula hoặc query performance; payment/write paths và report filters vẫn là
  decision gates.
- Commit/push: `4af9d5e` đã push thành công lên `origin/master`.

### Completed checkpoint: REST documentation inventory (ready to commit)

- Independent review: inventory chỉ là documentation source, không được coi là
  authorization/routing; không thay đổi route behavior hoặc DB.
- Changed write-set: `backend/src/rest-manifest.ts`, OpenAPI adapter dùng
  manifest thay cho tuple hard-code và uniqueness/security test. MCP `/mcp`
  vẫn tách riêng trong MCP manifest.
- Acceptance evidence: backend `npm run validate` pass (77 tests, typecheck,
  lint và build); manifest có unique method/path, security explicit và không
  giả mạo `/mcp` như REST route.
- Limitation: static manifest hiện bao phủ inventory docs hiện có; runtime
  route registration parity với toàn bộ route modules vẫn là gate kế tiếp, chưa
  tuyên bố hoàn tất drift elimination.
- Database impact: none; không migration/index/write, không cần Kubernetes
  backup.
- Commit/push: `ad2f56e` đã push thành công lên `origin/master`.

### Completed checkpoint: Runtime REST route parity gate (ready to commit)

- Independent review: Fastify public `printRoutes()` là nguồn runtime inventory
  phù hợp; không dùng private router internals và không import `server.ts` trong
  test vì file này connect DB/listen/scheduler. Route registration được tách ra
  thành composition helper dùng chung production/test.
- Changed write-set: `backend/src/runtime-routes.ts`, production `server.ts`
  gọi helper giữ nguyên thứ tự, export type auth options, parser inventory và
  runtime parity test; REST manifest bổ sung đủ admin/masterdata/fee/cashback/
  workspace/calendar routes.
- Acceptance evidence: backend `npm run validate` pass (80 tests, typecheck,
  lint và build); parser chỉ normalize parameter names, không che static path;
  production profile có 75 method/path và `missingInDocs/docsOnly` đều rỗng.
  Test không gọi handler, không connect Mongo, không ghi DB.
- Compatibility/risk: `/mcp`, `/docs` và Swagger không nằm trong REST business
  inventory; security metadata hiện vẫn là transport-level `public/session/
  bearer`, auth policy chi tiết (admin/bootstrap/feed token) là follow-up docs
  refinement. Route ordering static-before-parameter được giữ nguyên.
- Database impact: registration/docs/test-only, không schema/index/migration/
  data/write, không cần Kubernetes backup.
- Commit/push: `de69c2c` đã push thành công lên `origin/master`; ledger này sẽ
  được ghi nhận ở commit docs kế tiếp.

### Completed checkpoint: Financial Transaction contract registry (ready to commit)

- Independent review: bounded scope là canonical input/output cho Financial
  Ledger REST/MCP/frontend; không claim statement projection parity và không mở
  generic preview/confirm/audit redesign trong cùng slice.
- Changed write-set: shared Zod schemas/DTO types và fixtures; REST transaction
  input parse với stable `INVALID_TRANSACTION`; `FinancialTransactionService`
  serialize/list runtime-parse bằng shared DTO; MCP preview/confirm schema dùng
  cùng batch contract; frontend transaction client runtime-parse cùng list DTO.
- Canonical coverage: `GET/POST /api/financial-transactions`, MCP
  `list_transactions` và financial transaction preview/confirm payload. Preview
  response hiện vẫn là compatibility projection (`previewImpact`/`serviceFee`),
  chưa phải canonical preview envelope; statement dashboard projection thuộc
  Credit Billing slice sau.
- Acceptance evidence: shared `npm run validate` pass (7 tests, gồm safe
  integer và batch bound), backend `npm run validate` pass (77 tests, typecheck,
  lint và build), frontend `typecheck`, `lint` và `test` pass (70 unit + 6
  integration).
- Database impact: chỉ thay contract/parsing/serializer logic; không đổi
  model/index/migration/collection/data, không cần Kubernetes backup.
- Residual risk: REST POST vẫn đi qua service nhưng chưa có generic command
  preview/confirm/idempotency/audit contract; service còn dùng receipt cũ và
  `JSON.stringify` payload hash. Những thay đổi persistent này phải mở thành
  decision gate và xin user trước khi chạm database.
- Commit/push: `e2a6b9b` đã push thành công lên `origin/master`; ledger này sẽ được ghi nhận ở commit docs kế tiếp.

### Completed checkpoint: Planning Budget read parity

- Independent review: bounded scope chỉ là read DTO parity; không sửa PUT/upsert,
  route write behavior, model/index, MCP hay database. `remainingAmount` được
  định nghĩa là `max(limitAmount - usedAmount, 0)` và UI dùng `status`/
  `usagePercent` do backend tính.
- Changed write-set: shared Planning runtime schema/type và fixture; backend
  Budget status serializer/parser cùng helper test; frontend finance client
  runtime-parse và Budget page bỏ local shadow DTO/compatibility fallback; thêm
  unit test vào frontend test inventory.
- Canonical DTO: `id`, `month`, `categoryId`, `limitAmount`, `usedAmount`,
  `remainingAmount`, `usagePercent`, `status`. Backend vẫn là nơi duy nhất
  aggregate transaction spending và phân loại SAFE/WARNING/EXCEEDED.
- Acceptance evidence: shared `npm run validate` pass (8 tests), backend
  `npm run validate` pass (78 tests, typecheck, lint, build), frontend
  `typecheck`, `lint`, `test` pass (71 unit + 6 integration).
- Database impact: chỉ parse/serialize response và presentation contract; không
  migration/index/schema/data/write, không cần Kubernetes backup.
- Residual risk: Budget write input và month validation vẫn là AS-IS; sẽ xử lý
  trong Planning command slice riêng. Không mở Planning MCP tool.
- Commit/push: `cc4d333` đã push thành công lên `origin/master`; ledger này sẽ được ghi nhận ở commit docs kế tiếp.

### Completed checkpoint: Credit Billing Statement Read v1 (ready to commit)

- Independent review: read-only vertical slice đã được duyệt; canonical source là
  persisted `creditDebt`/transaction impact. Không migrate dữ liệu, không đổi
  payment PATCH/state transition, không thêm MCP mutation.
- Changed write-set: shared `StatementDto`/summary/transaction schemas và types;
  backend `StatementQueryService` batch-load statements/cards/transactions,
  REST statement GET adapters và `FinancialReportService` delegation; MCP
  `get_statement_summary`/`list_upcoming_statements` tiếp tục đi qua service;
  frontend parser + compatibility adapter cho `_id/userCardId` và legacy
  payment consumer; cards/payments/upcoming UI đọc `summary.outstandingAmount`.
- Canonical formulas: positive `creditDebt` là statement amount, negative
  `creditDebt`/`STATEMENT_PAYMENT` là payment amount, outstanding là
  `max(statementAmount - paymentAmount, 0)`; payment không tăng transaction
  count; reimbursement và receivable lấy persisted impact, không tính lại từ
  `serviceFeeRate`/cashback.
- Acceptance evidence: shared `npm run validate` pass (9 tests); backend
  `npm run validate` pass (83 tests, typecheck, lint, build); frontend
  `typecheck`, `lint`, `npm test` pass (72 unit + 6 integration); focused
  statement query and REST tests cover parent/workspace scope and one batch
  transaction query.
- Compatibility/risk: payment PATCH response/request vẫn legacy và giữ adapter;
  notification/calendar/reminder và `creditStatements` report projection chưa
  chuyển sang canonical service; generic preview-confirm-idempotency-audit
  guard vẫn là decision gate cho write slice kế tiếp.
- Database impact: chỉ read repository/service/contract/UI code và test fixtures;
  không schema/index/migration/data/write, không cần Kubernetes backup.
- Commit/push: feature `177b347` đã push thành công lên `origin/master`; ledger
  SHA sẽ được ghi ở commit docs kế tiếp.

### Completed checkpoint: Stateless MCP Preview Token Hardening (ready to commit)

- Independent review: bounded code-only slice; TTL canonical giảm từ 1800 xuống
  300 giây. Không mở one-time consume, human approval receipt, resource version,
  idempotency reservation, append-only audit hay Mongo transaction.
- Changed write-set: injected `PreviewTokenCodec` với HMAC domain separation,
  recursive canonical JSON/SHA-256 payload hash, context hash của
  `workspaceId/userId/channel`, operation/version/issuedAt/expiresAt claims;
  `MCP_PREVIEW_SECRET` riêng bắt buộc khi `MCP_HTTP_TOKEN` bật; MCP HTTP/server/
  tools inject codec; operation constants lấy từ manifest; config/SRS/README và
  focused tests cập nhật.
- Security behavior: token v1 không chứa raw payload, verify fail-closed với
  signature/claim/hash/context/expiry sai; metadata `expiresAt` và
  `expiresInSeconds` derive cùng codec. `verifyPreviewToken` được dùng thay
  `consume`; alias cũ chỉ để compatibility và token vẫn replayable tới expiry.
- Acceptance evidence: focused MCP/config/inventory tests pass (8 tests); backend
  `npm run validate` pass (85 tests, typecheck, lint, build). Không truy cập,
  migrate hoặc ghi database.
- Residual risk: cùng token có thể replay và idempotency receipt hiện tại chưa
  phải audit; cần decision gate riêng, backup/recovery plan và user approval
  trước khi đổi persistence.
- Commit/push: feature `425bbec` đã push thành công lên `origin/master`; ledger
  SHA sẽ được ghi ở commit docs kế tiếp.

### Completed checkpoint: SRS risk ledger refresh

- `GAP-STM-01`, `GAP-MCP-01`, `GAP-API-01` và `GAP-PERF-01` đã chuyển từ mô tả
  stale sang trạng thái partial/residual đúng với các slice đã push; không claim
  payment/calendar/reminder/report parity hoặc one-time audit đã hoàn tất.
- Database impact: docs-only, không query/migration/index/write và không cần
  Kubernetes backup.
- Commit/push: `c7e4cb6` đã push thành công lên `origin/master`.

### Completed checkpoint: Statement malformed-id fail-closed correction

- `StatementQueryService.getById` trả `null` cho identifier không hợp lệ để MCP
  không làm lộ CastError; REST detail trả `INVALID_STATEMENT_ID` trước khi query
  statement. Parent card id cũng được kiểm tra trước batch/read projection.
- Acceptance evidence: focused StatementQuery/REST tests pass (9 tests); không
  thay đổi model/index/migration hoặc dữ liệu.
- Commit/push: `9ef5d33` đã push thành công lên `origin/master`.

### Completed checkpoint: Engagement Notification Statement Projection

- Independent review: bounded read-only slice; không gọi `upcoming()` vì
  notification phải giữ paid rows và limit 1..100. Orphan statement vẫn được
  trả để giữ compatibility, card thiếu dùng fallback message hiện tại.
- Changed write-set: `StatementQueryService.listNotifications` batch-load canonical
  Statement DTO/financial impact; notification adapter dùng effective status và
  `CardQueryService`; runtime composition truyền trusted auth repository để
  browser context revalidate user/workspace; focused notification tests.
- Compatibility: response envelope và exact row fields (`id`, `type`, `status`,
  `title`, `message`, `dueDate`, `paymentStatus`, `cardId`, `meta.limit`) giữ
  nguyên; chỉ thay source của status/ordering/amount semantics sang backend
  service. Calendar feed/reminder/report projection chưa chuyển.
- Acceptance evidence: backend `npm run validate` pass (88 tests, typecheck,
  lint, build), focused notification tests cover paid/overdue/future/orphan,
  clamp 100, workspace filters, single transaction batch và unauthenticated
  rejection.
- Database impact: read-only model access thay qua service, không schema/index/
  migration/data write, không cần Kubernetes backup.
- Commit/push: `c3e396f` đã push thành công lên `origin/master`; ledger SHA sẽ
  được ghi ở commit docs kế tiếp.

### Completed checkpoint: Private Calendar Feed Statement Projection

- Independent review: read projection dùng service mới nhưng không gọi
  `upcoming()` vì feed cần card ownership theo subscription và private token
  semantics riêng. Chỉ active subscription/user hợp lệ mới được đọc.
- Changed write-set: `CardQueryService.list` hỗ trợ trusted `userId` scope;
  `StatementQueryService.listForCardIds` batch-load unpaid statements và
  transactions; calendar feed adapter map canonical `summary.outstandingAmount`,
  `effectivePaymentStatus`, card metadata sang cùng `StatementCalendarInput`.
  `lastAccessedAt` update vẫn giữ nguyên behavior hiện hữu.
- Compatibility: ICS event identity, three-day window, alarms, headers và token
  validation không đổi; chỉ amount/status source chuyển khỏi `$sum(amount)` và
  direct model reads.
- Acceptance evidence: backend `npm run validate` pass (90 tests, typecheck,
  lint, build); focused calendar/service tests xác nhận owner đổi workspace bị
  chặn trước card read, card ids được lọc theo workspace, PAID bị loại khỏi
  feed, charge 600k trừ payment 100k thành outstanding 500k, one transaction
  batch và canonical VND totals.
- Database impact: chỉ read query/service refactor; `lastAccessedAt` là write
  behavior đã tồn tại, không thay đổi schema/index/migration và không cần backup.
- Commit/push: feature `382e386` và ownership/test hardening `b46f460` đã push
  thành công lên `origin/master`; ledger SHA sẽ
  được ghi ở commit docs kế tiếp.

### Completed checkpoint: Payment Reminder Statement Projection

- Independent review: bounded job-adapter read refactor; delivery claim/update,
  retry/backoff, recipient validation và SMTP contract được giữ nguyên. Chỉ
  statement/date/amount source chuyển sang `StatementQueryService` canonical.
- Changed write-set: `StatementReadOptions.paymentDueDates` và workspace-scoped
  `listForCardIds`; `ReminderScheduler` tạo trusted `job` context theo workspace,
  lấy unpaid statements theo đúng due dates, dùng `StatementDto.summary.outstandingAmount`
  thay cho `$sum(amount)`/loại payment thủ công; reminder tests dùng canonical DTO.
- Compatibility: exact due-date calculation, per-card reminder offsets/timezone,
  workspace-owner fallback, delivery idempotency key, status transitions và
  Vietnamese email content không đổi.
- Acceptance evidence: backend `npm run validate` pass (90 tests, typecheck,
  lint, build); focused reminder/service tests xác nhận một workspace batch,
  due-date filter, canonical partial-payment amount và user/delivery counts.
- Database impact: không đổi model/schema/index/migration; các write hiện hữu
  trên `ReminderDeliveryModel` vẫn giữ nguyên vì là delivery state, không tạo
  persistence mới và không cần Kubernetes backup.
- Commit/push: `f0e579b` đã push thành công lên `origin/master`; ledger SHA sẽ
  được ghi ở commit docs kế tiếp.

### Completed checkpoint: One-off Calendar Email Statement Projection

- Independent review: bounded browser read/composition adapter; recipient
  validation, masked logging, ICS serialization, mail error mapping và response
  envelope giữ nguyên. Payment PATCH và legacy transaction serializer không nằm
  trong write-set.
- Changed write-set: calendar-email route dùng một lần trusted browser context,
  `CardQueryService.get` và `StatementQueryService.get`; projection lấy card
  metadata, effective status và `summary.outstandingAmount` canonical thay cho
  direct model reads + legacy `summarize` formula. Tests mock service contracts,
  không mock raw model cho slice này.
- Compatibility: authoritative account email vẫn được đọc/revalidate một lần;
  query/body recipient override và secret không được tin; subject, attachment,
  filename, calendar content, masked recipient và safe provider errors giữ nguyên.
- Acceptance evidence: backend `npm run validate` pass (90 tests, typecheck,
  lint, build); focused tests xác nhận auth trước read, account read một lần,
  canonical 250k amount, inaccessible card/statement và redacted mail failures.
- Database impact: không schema/index/migration/data mutation mới; chỉ sử dụng
  service read projection và không cần Kubernetes backup.
- Commit/push: `c36ac95` đã push thành công lên `origin/master`; ledger SHA sẽ
  được ghi ở commit docs kế tiếp.

### Completed checkpoint: Credit Statement Report Projection

- Independent review: bounded report read adapter; output field names và route
  envelope giữ nguyên, chỉ thay nguồn dữ liệu và công thức bằng canonical
  `StatementDto.summary`. Không mở rộng sang financial summary, fee/cashback
  writes hoặc payment state transition.
- Changed write-set: `StatementReadOptions.statementDateFrom/To` được áp dụng ở
  workspace-scoped Mongo repository; `FinancialReportService.creditStatements`
  gọi `StatementQueryService.list` một lần với `paymentDueDate` ordering và map
  `statementAmount/paymentAmount/outstandingAmount` sang compatibility fields
  `grossCharges/payments/outstandingDebt`.
- Compatibility: `statementId`, dates, `paymentStatus`, gross/payments,
  personalSpending, receivable và transactionCount vẫn có; amount lấy persisted
  `creditDebt`, payment/reimbursement semantics không còn tự cộng `amount`.
- Acceptance evidence: backend `npm run validate` pass (92 tests, typecheck,
  lint, build); dedicated report tests cover bounded date range, no-range query,
  canonical partial payment 600k - 100k = 500k và output mapping.
- Database impact: chỉ read query/service refactor, không schema/index/migration/
  data write và không cần Kubernetes backup.
- Commit/push: `1f954a4` đã push thành công lên `origin/master`; ledger SHA sẽ
  được ghi ở commit docs kế tiếp.

### Completed checkpoint: Generic Command Guard Foundation (code + additive indexes)

- Independent review: generic foundation đi trước payment preview/confirm; bounded
  write-set không sửa business collections, không migrate hoặc đổi `McpMutationModel`
  receipt cũ. Command guard chỉ ghi audit `SUCCESS` sau completed receipt; failed
  attempt policy và adapter integration là follow-up.
- Changed write-set: `backend/src/command-hash.ts` canonical JSON/SHA-256 helper
  dùng chung cho MCP preview và existing idempotency payload hashes; additive
  `CommandReceiptModel` (`commandreceipts`), `CommandAuditModel`
  (`commandaudits`), `CommandGuardService` reserve/replay/mismatch/pending guard
  và safe resource audit metadata; operator script
  `ensure-command-guard-indexes.ts` mặc định dry-run.
- Semantics: receipt state `PENDING|COMPLETED|FAILED`, unique workspace/operation/key,
  payload hash mismatch `409`, replay không chạy business callback lần hai, callback
  và completed receipt/audit cùng transaction; concurrent duplicate retry fail-closed.
  Không lưu raw payload/token/secret; `McpMutationModel` vẫn giữ compatibility.
- Compatibility review follow-up: existing `McpMutationModel` receipts vẫn được
  replay bằng legacy `JSON.stringify` hash hoặc canonical hash; business callback
  phát sinh duplicate key không bị retry nhầm, và completion phải match đúng một
  receipt trước khi ghi audit.
- Acceptance evidence: focused guard/hash/preview/account tests pass (16 tests);
  backend `npm run validate` pass (157 tests, typecheck, lint, build); shared
  `npm run validate` pass (24 tests); frontend `npm test` pass (84 unit + 6
  integration), typecheck/lint/build pass. Code commit không chứa DB mutation;
  additive index rollout được thực hiện sau commit và có backup riêng.
- Code commit/push: `0ee1cef` đã push lên `origin/master`; backup/DB rollout
  được ghi riêng dưới đây trước khi mở adapter integration.
- DB rollout evidence: context `k8s-admin-public`, namespace `card-credit`, pod
  `card-credit-backend-68ffb6578f-6tzvq`; backup workspace
  `longhn0710-workspace` tại `/tmp/card-credit-command-guard-backup/finance-
  longhn0710-workspace-2026-08-16T14-54-00.001Z.json` (local mode 600, không
  commit). Trước apply `commandreceipts=0`, `commandaudits=0`, duplicate receipt
  groups `0`; apply tạo bốn named indexes và verify thành công:
  `command_receipt_unique`, `command_receipt_workspace_created`,
  `command_audit_workspace_created`, `command_audit_workspace_operation_created`.
- Residual risk: service chưa được nối vào Payment adapter; không claim
  `GAP-MCP-01` đã đóng. Collections đang rỗng, deployment hiện tại chưa chứa
  code `0ee1cef`; adapter writer phải được rollout sau khi fence pod cũ.

### Completed checkpoint: Account + Financial Transaction Command Guard Wiring (REST + MCP)

- Independent review: command adapter truyền `CommandInvocation` cố định gồm
  `idempotencyKey`, `endpointOrTool`, optional `previewId`; REST bắt buộc header
  `Idempotency-Key` tối thiểu 8 ký tự, MCP confirm verify token trước khi gọi
  service. Legacy receipt được đọc trong cùng guard transaction và replay bằng
  cả legacy `JSON.stringify` hash lẫn canonical hash.
- Changed write-set: `AccountService.create` và
  `FinancialTransactionService.create/createBatch` dùng `CommandGuardService`
  cho một receipt/audit transaction; account/transaction REST adapters truyền
  endpoint metadata và reject thiếu key; MCP confirm adapters truyền cùng
  command boundary. Không sửa payment command, business collections hoặc
  frontend write UI vì hiện frontend chỉ có finance GET/AI placeholder.
- Safety: duplicate key từ business callback không retry nhầm; completion phải
  match receipt; Account CREDIT card lookup và transaction statement upsert dùng
  cùng Mongo session. `STATEMENT_PAYMENT` generic path bị reject trước guard.
- Acceptance evidence: focused command/route/MCP/legacy tests pass; backend
  `npm run validate` pass (164 tests, typecheck, lint, build); shared
  `npm run validate` pass (24 tests); frontend `npm test` pass (84 unit + 6
  integration), typecheck/lint/build pass. No DB migration; dùng bốn additive
  command guard indexes đã verify ở checkpoint trước.
- Code commit/push: `bd1a8ae` đã push lên `origin/master`; agent rules và
  transport docs cũng được cập nhật để không tạo writer bypass hoặc rolling
  split-brain.
- Rollout gate: code mới chưa được bật cùng old pod; phải drain/fence old command
  writers hoặc có dual-write transition trước deploy production để tránh
  `McpMutationModel` và `CommandReceipt` split-brain.
- Residual risk: browser chưa có preview endpoint/UI thực sự, account preview
  hiện chỉ phát token, token chưa one-time/resource-version; Payment/MCP payment
  vẫn là follow-up.

### Completed checkpoint: Statement Payment Command Boundary (REST + Frontend)

- Independent review: bounded financial-write slice được duyệt với transition
  CLOSED -> STATEMENT_CLOSED, REOPEN -> OPEN chỉ khi chưa PAID, và PAID bị khóa;
  PAID lặp lại với payment transaction hiện hữu là idempotent. Không xóa/reverse
  STATEMENT_PAYMENT; reversal cần command/transaction type riêng ở follow-up.
- Changed write-set: shared strict statement payment action/input schemas;
  StatementPaymentCommandService sở hữu workspace/card scope, persisted
  creditDebt totals, repayment-account validation, Mongo transaction và state
  update; REST adapter chỉ parse input/context rồi trả StatementDto; /cards và
  /payments runtime-parse accounts, yêu cầu chọn REAL_MONEY repayment account
  và gửi cùng command. Legacy TransactionService/legacy payment serializer đã
  xóa vì không còn consumer.
- Financial guard: payment impact đi qua calculateFinancialImpact, không ghi
  Account aggregate; partial unique index {workspaceId, statementId, transactionType}
  cho STATEMENT_PAYMENT được khai báo trong model và đã áp dụng live sau backup.
  Audit trước index không có duplicate group, nhưng có 2 legacy statement đang
  chưa PAID dù đã có payment transaction; command trả PAYMENT_STATE_CONFLICT để
  chờ reconciliation.
- Acceptance evidence: shared npm run validate pass (24 tests); backend
  npm run validate pass (148 tests, typecheck, lint, build); frontend typecheck,
  lint, test:unit pass (84 tests), test:integration pass (6 tests) và build pass.
  Payment tests cover strict input, generic STATEMENT_PAYMENT rejection, totals,
  state matrix, model index declaration and trusted route context.
- Database/operations: trước khi tạo index đã backup workspace
  longhn0710-workspace từ pod card-credit-backend-68ffb6578f-6tzvq về
  /tmp/card-credit-finance-backup/finance-longhn0710-workspace-2026-08-16T14-25-46.448Z.json
  (local mode 600); không commit backup/secret.
- Residual risk: command chưa có preview/confirm receipt, generic persistent
  idempotency/audit, resource-version CAS hoặc MCP payment tool; reversal và
  reconciliation cho 2 legacy records là follow-up. Live index application
  evidence đã ghi ở mục rollout bên dưới; commit code là 0dc20e7.
- DB rollout evidence: context k8s-admin-public, namespace card-credit, pod
  card-credit-backend-68ffb6578f-6tzvq; backup trước mutation đã lưu local mode
  600. createIndex trả statement_payment_unique; verify sau mutation ghi
 hasUnique=true, duplicateGroups=0, notPaidWithPayment=2. Không sửa/xóa 2
 legacy records trong slice này.
- Commit/push: feature code đã push tại 0dc20e7; thay đổi DB/index đã verify
  trên cluster, không chứa backup trong git. Docs checkpoint này sẽ được push
  trong commit kế tiếp.

### Decision checkpoint: Canonical MCP writer enablement

- User decision: user explicitly chose to enable the canonical MCP writer and
  stated that no legacy old writer is needed/in scope. This is recorded as a
  decision, not as independent traffic proof.
- Changed write-set: GitOps chart `card-credit/values.yaml` only, commit
  `f4eb8b56ad08af5a0064ac07156cb80a42e095a6`, rebased on remote chart commit
  `6c1da60`; image remains the already-published `e1ce0fe53242`. Values are
  `mcp.writerMode: write` and `mcp.oldWriterFenced: true`; application source
  default remains fail-closed `read` and its guard still rejects write without
  the fenced acknowledgement.
- Validation/review: Helm lint passed; Helm template rendered the expected
  image and both MCP env values; backend config regression test passed `4/4`;
  no MCP preview/confirm or other persistence command was invoked.
- Runtime gate: Argo tự reconcile chart `f4eb8b56ad08af5a0064ac07156cb80a42e095a6`
  và báo `Synced/Healthy` sau rollout. Backend pod
  `card-credit-backend-849c785c94-ftgq9` Ready `1/1`, restart `0`; `/health` và
  `/ready` trả `200`; `/docs/json` xác nhận `writerMode=write` và policy
  `Preview -> explicit confirmation -> idempotent confirm`. Pod env xác nhận
  `MCP_WRITER_MODE=write`, `MCP_OLD_WRITER_FENCED=true`; startup log có
  `SERVER_LISTENING` và không có `ERR_MODULE_NOT_FOUND`. Đây chỉ là bằng chứng
  capability/config runtime; không gọi financial mutation smoke, preview,
  confirm hoặc persistence command. Rollback là chart revert về
  `writerMode: read`, `oldWriterFenced: false`.
- Database/financial impact: no database, schema, migration, reversal or
  compensating transaction change was made; enabling a write-capable surface
  does not itself create a financial record.

### Completed checkpoint: Session-version atomic guard regression

- Requirement/GAP: `GAP-SEC-01`/`GAP-SEC-02` cần chứng minh session claim bị
  revoke khi password, role hoặc workspace thay đổi; không mở live database
  mutation trong batch này.
- Source review: `browserActorContext` đối chiếu authoritative
  `sessionVersion`, `workspaceId`, `active` và `lockedAt`; `MongoAuthRepository`
  dùng `$inc: { sessionVersion: 1 }` cho `updatePassword` và role/workspace
  `updateUser`, còn `upsertUser` tăng version khi bootstrap thay đổi security
  fields.
- Regression evidence: thêm
  `backend/tests/auth-repository.test.ts`, kiểm tra atomic version bump cho
  password và role/workspace update; focused test pass `1/1`; backend curated
  `npm test` pass `136/136`; typecheck và lint pass.
- Runtime boundary: chưa bump/revoke user authoritative trên cluster và chưa
  kiểm tra policy membership bằng persistence mutation; không sửa database,
  schema, migration hay Kubernetes. Vì vậy source guard đã có evidence nhưng
  `GAP-SEC-01`/`GAP-SEC-02` chưa được claim đóng.
- Commit/push: batch code/test/docs được ghi trong commit kế tiếp; rollback là
  revert commit này, không ảnh hưởng dữ liệu runtime.

### Completed checkpoint: SRS claim-status cleanup

- Scope: chuẩn hóa GAP ledger theo evidence hiện có, không thêm target mới và
  không biến source/test evidence thành production financial evidence.
- Claimed `CLOSED`: `GAP-CI-01`, `GAP-OPS-01`, `GAP-API-01`, `GAP-WEB-01` và
  `GAP-DOC-01`, dựa trên các CI/GitOps/runtime/inventory evidence đã ghi.
- Marked `PARTIAL`: `GAP-SEC-01/02`, `GAP-MCP-01`, `GAP-PAY-01/02`,
  `GAP-STM-01`, `GAP-REP-01` và `GAP-AUTH-01`; code/test hoặc capability đã có,
  nhưng runtime authoritative, financial receipt/reconciliation, source-of-
  truth, legacy category hoặc mail config evidence còn thiếu tùy GAP.
- Kept `OPEN`: card/account/calendar lifecycle decisions, report filter/range
  semantics, UI/write contracts và các bounded-list completeness gaps.
- Safety: docs-only status cleanup; không database/schema/migration/data write,
  không financial mutation/reversal, không Kubernetes mutation.
- Validation: `git diff --check` và đối chiếu SRS với execution-plan evidence;
  commit/push được ghi ở application commit kế tiếp.

### Completed checkpoint: Proxy cleanup CI publication and GitOps handoff

- Requirement/GAP: `GAP-CI-01` cần tách source/test, image publication và
  GitOps handoff khỏi runtime evidence cho proxy cleanup.
- Independent review: source checkout của Jenkins `#373` đúng commit
  `19f068f18d53f7a400402256f917478e54beec2c6`; shared/frontend/backend test
  phases pass (`25/25`, `45/45`, `135/135`), frontend build output nhận diện
  `ƒ Proxy (Middleware)`, và Jenkins kết thúc `SUCCESS`.
- Registry evidence: registry read-only xác nhận image tags
  `frontend:19f068f18d53` digest
  `sha256:a6d93c72bd1360adfea46b807d13f69a41c499b68c7e9f1699bbb3dad96cbfa1`
  và `backend:19f068f18d53` digest
  `sha256:53172f407810893aa2262d002c833c604b142ab1758b39cc815cf9c8cfcf2a08`.
- GitOps evidence: Jenkins pushed chart commit `952c0fc`, message
  `Deploy card-credit 19f068f18d53`, to `k8s-namepsace-chart`.
- Independent chart review: commit đầy đủ
  `952c0fc18354b19a4231dc41bfcfd8a6d16fcb28` đổi đúng
  `card-credit/values.yaml:image.tag` từ `3fffccda40e8` sang
  `19f068f18d53`; cùng revision giữ `mcp.writerMode: read` và
  `mcp.oldWriterFenced: false`.
- Old-writer inventory evidence: trên Kubernetes context `k8s-admin-public`,
  read-only inventory toàn cluster chỉ thấy hai workload card-credit là
  `card-credit-backend` và `card-credit-frontend`, cùng các Service/Ingress
  của application; không thấy workload/service/ingress old statement-payment
  writer riêng. Đây là negative evidence trong cluster hiện tại, không phải
  bằng chứng external consumer đã được owner xác nhận hoặc đã drain.
- Runtime evidence: sau khi Argo tự reconcile chart `952c0fc`, Kubernetes
  read-only thấy backend/frontend tag `19f068f18d53`, cả hai Ready với restart
  `0`; Argo `card-credit` là `Synced/Healthy`, revision
  `952c0fc18354b19a4231dc41bfcfd8a6d16fcb28`. Pod smoke pass `/health` 200,
  `/ready` 200 và `/docs/json` xác nhận `writerMode=read` cùng mutation tools
  không đăng ký; frontend ingress `/login` 200 và `/` 307. Không scale/restart/
  patch/sync Kubernetes và không có database/persistence change.
- Decision/next gate: giữ `MCP_WRITER_MODE=read`, không chạy mixed writers;
  Argo reconcile/runtime health/ready/docs read-only cho tag mới và external
  old-writer fence/drain vẫn là gate mở. Reversal/compensating transaction và
  card delete/merge vẫn cần user decision riêng.
- Commit/push: checkpoint này được ghi trong commit kế tiếp; rollback chỉ là
  revert docs commit, không ảnh hưởng runtime.

### Completed checkpoint: Payment Command Guard (REST + Frontend)

- Independent review: payment command được duyệt sau khi đóng hai blocker: hash
  phải bind cả `cardId`/`statementId` và duplicate retry chỉ được giới hạn cho
  unique payment index, không retry mù mọi business error.
- Changed write-set: `StatementPaymentCommandService.execute` nhận
  `CommandInvocation` bắt buộc, tạo canonical payload hash chứa resource identity,
  chạy `CommandGuardService` cùng Mongo session và chỉ lưu safe result metadata
  (`statementId`, action, payment status, paidAt, paidAmount) trong receipt/audit.
  REST PATCH yêu cầu `Idempotency-Key` tối thiểu 8 ký tự; Cards/Payments giữ một
  key cho mỗi user action để retry không tạo command mới và xóa key sau success.
- Safety: bounded retry tối đa một lần chỉ khi `statement_payment_unique` tranh
  chấp; mọi command khác fail-closed. Không mở MCP payment tool, preview/confirm
  hoặc thay đổi state-machine/reversal trong slice này.
- Acceptance evidence: backend `npm run validate` pass (165 tests,
  typecheck/lint/build); shared `npm run validate` pass (24 tests); frontend
  typecheck/lint/test pass (84 unit + 6 integration) và production build pass.
- Database impact: không migration, không index mới và không ghi dữ liệu; dùng
  bốn command-guard indexes đã rollout ở checkpoint trước. Vì vậy không cần
  backup DB cho slice này.
- Rollout gate: pod cũ vẫn có thể ghi payment ngoài `CommandReceipt`; phải
  fence/drain old writers hoặc hoàn tất dual-write transition trước deploy code
  mới lên môi trường dùng chung.
- Commit/push: `9f7466e` đã push lên `origin/master`.

### Completed checkpoint: Payment Preview Contract Parity (read-only)

- Independent review boundary: chỉ mở read-only preview để browser nhận exact
  persisted ledger impact; không phát token mới, không ghi receipt, không thêm
  MCP payment tool và không thay đổi database.
- Changed write-set: shared `StatementPaymentPreviewDto`/warning enum;
  `StatementPaymentCommandService.preview` đọc statement + transactions trong
  workspace, tính `statementAmount`, `paymentAmount`, `outstandingAmount`,
  `amountToPay`, account requirement và warnings; REST
  `POST .../payment/preview` là adapter duy nhất. Cards/Payments gọi cùng client
  parser trước confirmation và không tự tính lại số tiền.
- Safety: preview không cần `Idempotency-Key` vì không có side effect; execute
  vẫn bắt buộc key và generic guard. Preview có thể stale trước PATCH vì chưa có
  resource-version/CAS; UI chỉ dùng nó để human confirm, không coi đó là lock.
- Acceptance evidence: shared contract test cover exact fields/strictness;
  backend preview service/route tests cover workspace-scoped read and missing
  repayment account; frontend typecheck/lint/unit/integration continue to pass.
- Database impact: read-only, không migration/index/backup.
- Commit/push: `ad2bfb5` đã push lên `origin/master`.

### Completed checkpoint: Payment Preview Version CAS

- Independent review scope: đóng stale-preview race mà không thêm persistence;
  preview trả `version` từ `CardStatement.updatedAt`, execute nhận
  `expectedVersion` trong cùng canonical input/hash.
- Changed write-set: shared payment input/preview contract thêm
  `expectedVersion`/`version`; `StatementPaymentCommandService` kiểm tra version
  trước ledger work và đưa `updatedAt` vào conditional state update trong cùng
  Mongo transaction. Sai version trả `PAYMENT_PREVIEW_STALE`; Cards/Payments
  truyền đúng version preview khi PATCH.
- Safety: không có version thì compatibility command cũ vẫn chạy; có version thì
  stale preview bị fail-closed, không tạo payment transaction. `expectedVersion`
  là precondition riêng, không nằm trong business payload hash, nên retry cùng
  idempotency key sau response loss vẫn replay safe dù preview version đổi; đổi
  action/account vẫn mismatch. Đây chưa phải one-time confirmation/token consume
  và không mở MCP payment.
- Acceptance evidence: focused backend payment suite pass (11 tests), backend
  typecheck/lint/build pass; shared validate pass (25 tests); frontend
  typecheck/lint/unit/integration pass (84 + 6). Full release validation sẽ chạy
  lại trước commit nếu code tiếp tục mở rộng.
- Database impact: chỉ đọc/conditional update trên collection hiện có; không
  migration, index mới hay backup.
- Commit/push: `efb52bf` đã push lên `origin/master`.

### Decision gate: Payment State Machine and Persistent Command Guard

- Đã chốt và triển khai bounded REST/Frontend command, read-only browser preview
  và preview-version CAS ở các checkpoint trên. Phần còn lại cần implementation
  riêng: one-time preview-confirm cho browser và MCP,
  one-time confirmation, generic idempotency/audit retention, resource
  version/CAS và reversal/compensating transaction sau PAID.
- Không mở MCP payment mutation cho tới khi các guard trên có persistence và
  concurrency evidence. Rollback code là revert commit; rollback live index cần
  drop chính xác statement_payment_unique sau khi dừng writer hoặc restore theo
  backup nếu phát hiện duplicate/semantics bất thường.

### Completed checkpoint: Frontend Private Surface Guard

- Independent review: frontend-only route-boundary slice; session proxy
  bao phủ các application UI/API route hiện hữu, còn card-catalog/auth public
  và calendar subscription feed token được giữ ngoài session guard có chủ đích.
- Changed write-set: `frontend/proxy.ts` (migrated from the deprecated
  `middleware.ts` convention) thêm private UI prefixes cho
  dashboard/transactions/accounts/budgets/reports/payments/notifications/fees/
  cashback/analytics và private finance API prefixes; `proxy.test.mjs`
  kiểm tra matcher/policy; `package.json` đưa test vào unit inventory.
- Compatibility: unauthenticated UI vẫn redirect `/login?next=...`; private API
  trả envelope `401`; calendar `.ics` feed tiếp tục dùng subscription token,
  không yêu cầu browser session.
- Acceptance evidence: frontend `typecheck`, `lint`, `npm test` pass (74 unit +
  6 integration) và `npm run build` pass; Next build chỉ cảnh báo convention
  `middleware` deprecated, không phải lỗi slice này.
- Database impact: không backend/model/schema/index/migration/data change, không
  cần Kubernetes backup. Rollback bằng revert frontend commit.

### Completed checkpoint: Next.js 16 proxy convention migration

- Requirement/GAP: loại bỏ deprecation warning của Next.js 16 cho
  `middleware.ts` mà không thay đổi private UI/API boundary hay financial
  behavior.
- Independent review: `frontend/middleware.ts` được rename thành
  `frontend/proxy.ts`, named export đổi từ `middleware` thành `proxy`; matcher,
  cookie name, unauthenticated API `401`, UI redirect và calendar subscription
  exclusion giữ nguyên. Regression test được rename thành `proxy.test.mjs` và
  critical/unit package entries được cập nhật.
- Changed write-set: chỉ frontend route-boundary filename/export/test/docs;
  không đổi persistence, REST/MCP command, database, financial state hay
  Kubernetes.
- Acceptance evidence: frontend `npm test` pass `45/45`, `npm run test:unit`
  pass `86/86`, typecheck và lint pass; `npm run build` pass và output nhận
  diện `ƒ Proxy (Middleware)` nhưng không còn warning deprecated middleware
  convention. Diff review xác nhận proxy source giống middleware source cũ
  ngoài filename/export.
- Residual/decision: đây là cleanup non-financial đã **GO**; session-version
  runtime, external old-writer fence/drain và financial decisions vẫn mở.

### Completed checkpoint: Deployment Smoke Report Contract

- Scope: smoke script drift correction; không thay đổi runtime route.
- Changed write-set: `frontend/scripts/smoke-test.mjs` gọi
  `/api/financial-reports/summary` và kiểm tra canonical `range/totals` thay cho
  path/shape `/api/reports/summary` đã bị loại khỏi backend.
- Acceptance evidence: `node --check scripts/smoke-test.mjs` pass; actual smoke
  deployment vẫn cần chạy trong môi trường có backend/session/catalog.
- Residual risk: `reportsCore` và một số docs legacy còn path cũ, được giữ trong
  compatibility-removal gate `GAP-DOC-01`, chưa xóa trong slice này.
- Database impact: docs/script-only, không query/migration/index/data write và
  không cần Kubernetes backup.
- Commit/push: `8211e2f` đã push thành công lên `origin/master`; ledger SHA sẽ
  được ghi ở commit docs kế tiếp.

### Completed checkpoint: Honest MCP Audit Metadata

- Scope: docs/runtime metadata-only; không thay đổi registered tools, token
  verification hay mutation execution behavior.
- Changed write-set: `backend/src/api-docs.ts` đánh dấu `auditStatus: PENDING`
  và sửa `mutationPolicy` để phản ánh preview/confirm/idempotency hiện có,
  append-only audit chưa được triển khai.
- Acceptance evidence: backend typecheck/lint và MCP inventory/REST manifest
  focused tests pass (4 tests); SRS GAP-MCP-01 vẫn giữ trạng thái partial.
- Database impact: không model/schema/index/migration/data write; không cần
  Kubernetes backup.
- Commit/push: `ba851a3` đã push thành công lên `origin/master`; ledger SHA sẽ
  được ghi ở commit docs kế tiếp.

### Completed checkpoint: Report UI Compatibility Removal

- Scope: frontend compatibility cleanup after backend report route became
  canonical; no backend API change.
- Changed write-set: removed unused `frontend/lib/api/reportsCore.mjs` and type
  declaration; Cards page report link no longer sends unsupported owner filter,
  and “Xuất JSON” points to `/api/financial-reports/summary` for the current
  month with an explicit workspace-wide label; tests now assert canonical path.
- Acceptance evidence: frontend `typecheck`, `lint`, `npm test` pass (73 unit +
  6 integration), `npm run build` pass; `rg` confirms no production consumer of
  `reportsCore` remains.
- Compatibility/removal: old `/api/reports/summary` browser helper is deleted;
  owner/card/year/month filtering remains a future report-contract slice because
  current backend summary only accepts `from/to`.
- Database impact: frontend-only, no model/schema/index/migration/data write and
  no Kubernetes backup required.
- Commit/push: `23a294d` đã push thành công lên `origin/master`; ledger SHA sẽ
  được ghi ở commit docs kế tiếp.

### Completed checkpoint: Report API Documentation Cleanup

- Scope: documentation-only contract correction; runtime route and DTO are
  unchanged.
- Changed write-set: `docs/api.md` now documents
  `/financial-reports/summary` and `/financial-reports/credit-statements`,
  `from/to` filters, canonical `StatementDto.summary` fields and explicit
  unsupported owner/card filters; SRS `GAP-DOC-01` updated accordingly.
- Acceptance evidence: docs diff checked with `git diff --check`; route/DTO
  references were compared against `rest-manifest.ts` and
  `FinancialReportService` implementation.
- Database impact: docs-only, no model/schema/index/migration/data write and no
  Kubernetes backup.
- Commit/push: `c13ef35` đã push thành công lên `origin/master`; ledger SHA sẽ
  được ghi ở commit docs kế tiếp.

### Completed checkpoint: Production-surface stale documentation cleanup

- Requirement/GAP: `GAP-DOC-01`, `GAP-API-01` và `GAP-WEB-01` yêu cầu production
  docs/client/smoke surface không còn endpoint cũ hoặc inventory metadata drift.
- Independent review: GO cho documentation/inventory slice. `rg` trên source,
  client, tests và maintained docs (loại trừ execution ledger/history) không
  còn `/api/reports/summary`, `reportsCore` hoặc `docs/refactor*`; smoke script,
  `docs/api.md` và report UI đều dùng `/api/financial-reports/summary`. Existing
  backend REST inventory, runtime composition, authorization metadata và
  frontend canonical-path regression tests vẫn nằm trong curated gate.
- Compatibility boundary: các historical checkpoint và kế hoạch Phase 9 vẫn
  được giữ để truy nguyên quyết định; chúng không phải production consumer và
  không được coi là stale runtime documentation.
- Acceptance evidence: `rg` stale-reference audit và `git diff --check` pass;
  không có model/schema/index/migration/data write, Kubernetes mutation,
  financial persistence hoặc reversal/compensating transaction.
- Residual risk: `GAP-PERF-01` chỉ mới bounded transaction list; pagination cho
  các collection khác vẫn mở. Rollback bằng revert docs/SRS checkpoint.

### Completed checkpoint: Benefits and Fees Report Read Parity

- Independent review: read-only bounded slice được duyệt. Canonical report
  totals giữ ledger metrics và thêm `totalServiceFee`,
  `transactionCashbackActual`, monthly bank cashback expected/actual/rejected,
  `totalPaidCardFees`, `actualNetBenefit`; grouped metrics không trộn semantics
  benefits.
- Changed write-set: shared `FinancialReportDto` runtime schema/type và fixture;
  `FinancialReportService` batch-read `FinancialTransactionModel`,
  `MonthlyCardCashbackModel`, `CardFeePaymentModel` theo workspace/range;
  REST/MCP cùng service; frontend client runtime-parse và Reports/Dashboard dùng
  shared type; MCP manifest mô tả benefit reconciliation.
- Canonical formulas: service fee là
  `EXPENSE + PAID_FOR_OTHER: max(amount - reimbursementExpected - refundReceived, 0)`; monthly
  cashback expected cộng toàn bộ bucket giao range, actual chỉ `RECEIVED`,
  rejected dùng expected; paid card fees chỉ gồm `ANNUAL_CARD_FEE`,
  `MANAGEMENT_FEE`, `OTHER_FEE`; `actualNetBenefit = monthly actual - service
  fee - paid card fees`; transaction cashback không cộng lần hai.
- Acceptance evidence: shared validate pass (10 tests); backend typecheck và
  focused financial-report tests pass (3 tests); frontend typecheck, lint và
  full test pass (73 unit + 6 integration); `git diff --check` pass.
- Residual risk: report endpoint vẫn chỉ nhận `from/to`; owner/card/year/month
  filters, orphan card-source cleanup, fee-category migration và benefit
  mutation command guard chưa mở. Monthly records là month buckets giao range,
  không prorate theo ngày.
- Database impact: chỉ đọc collection/index hiện có; không schema/index/
  migration/data write, không cần Kubernetes backup.
- Commit/push: feature `8f53b6d` và test-fix `41920dc` đã push thành công lên
  `origin/master`.

### Completed checkpoint: Refund-aware Service Fee Correction

- Scope: correctness-only refinement của report aggregation; persisted
  `refundReceived` được trừ khỏi service fee, phù hợp financial impact và không
  đổi schema hoặc mutation behavior.
- Acceptance evidence: focused financial-report tests pass (3 tests), gồm
  `reimbursementExpected + refundReceived` và net benefit; backend lint pass.
- Database impact: read-only field đã tồn tại trong `FinancialTransaction`; không
  migration/index/write, không cần Kubernetes backup.
- Commit/push: `1567c41` đã push thành công lên `origin/master`.

### Completed checkpoint: Fee Read Contract Parity

- Scope: read-only vertical slice cho card fee history và Fee Center. Shared
  runtime schemas/types định nghĩa `FeePaymentDto` và `FeeCenterRecordDto`;
  backend `FeeQueryService` là source duy nhất cho hai GET REST; frontend
  runtime-parse canonical DTO rồi giữ compatibility adapter riêng cho legacy
  card-fee UI/mutation responses.
- Security/tenancy: GET routes tạo `browserServiceContext`, revalidate signed
  session user/workspace và delegate card ownership cho `CardQueryService`;
  Fee Center giữ orphan fee record với `card: null` thay vì bỏ silent.
- Acceptance evidence: shared `validate` pass (11 tests); backend full
  `npm run validate` pass; frontend `typecheck`, `lint`, `test` pass (73 unit +
  6 integration) và `build` pass; `git diff --check` pass trước commit.
- Database impact: chỉ đọc `CardFeePayment`/`CreditCard` hiện có; không schema,
  index, migration hay data write, không cần Kubernetes backup.
- Residual risk: POST/PUT/DELETE fee routes vẫn là legacy direct-model
  compatibility paths; chưa có Fee MCP tool, generic preview-confirm/
  idempotency/audit cho fee mutation, và chưa migrate legacy fee categories.
- Commit/push: `eaf6ec8` đã push thành công lên `origin/master`.

### Completed checkpoint: Monthly Cashback Read Contract Parity

- Independent review: bounded read-only slice được duyệt; không cần user
  decision, schema migration hay Kubernetes backup.
- Scope: shared `MonthlyCashbackDto` canonicalizes Mongo `_id/userCardId`
  thành `id/cardId`, validates calendar period, safe VND amounts/status và
  ISO `receivedAt`; backend `MonthlyCashbackQueryService` owns card/workspace
  validation and year-bounded query; GET REST dùng trusted browser context.
- Frontend GET runtime-parse canonical DTO; mutation PUT response có adapter
  riêng để giữ compatibility, còn PUT/DELETE behavior không đổi. Rejected và
  pending records không expose actual amount ngoài canonical read contract.
- Acceptance evidence: shared `validate` pass (12 tests); backend full
  `npm run validate` pass (102 tests + build); frontend typecheck/lint/full
  tests pass (73 unit + 6 integration) và production build pass;
  `git diff --check` pass trước commit.
- Database impact: chỉ đọc collection/index `MonthlyCardCashback` và card
  hiện có; không schema/index/migration/data write, không cần backup DB.
- Residual risk: `FinancialReportService` vẫn aggregate trực tiếp model như
  bounded projection; PUT/DELETE cashback vẫn legacy direct-model paths; MCP
  read đã có nhưng generic mutation guard/audit chưa mở.
- Commit/push: `8dbd8a3` đã push thành công lên `origin/master`.

### Completed checkpoint: MCP Benefits Read Parity

- Independent review: read-only MCP slice được duyệt với ba query tools:
  `list_card_fee_payments`, `list_fee_center` và `list_monthly_cashbacks`.
- Changed write-set: MCP manifest và tool handlers chỉ parse bounded input,
  tạo invocation context/revalidation như các tool hiện có, rồi delegate
  `FeeQueryService`/`MonthlyCashbackQueryService`; output là JSON text chứa
  canonical shared DTO, không expose tenant fields hay Mongoose documents.
- Acceptance evidence: MCP inventory/tools-list parity và focused read-tool
  tests pass; backend full `npm run validate` pass (104 tests + build);
  malformed year/tenant input fail closed; fee orphan `card: null` và
  cashback rejected/pending `actualAmount: null` được giữ nguyên.
- Database impact: chỉ đọc các collection hiện có; không schema/index/
  migration/data write, không cần Kubernetes backup.
- Residual risk: MCP list tools chưa pagination/limit; fee/cashback mutation
  vẫn ngoài MCP cho tới preview-confirm-idempotency-audit.
- Commit/push: `8a3524f` đã push thành công lên `origin/master`.

### Decision gate: Owner/Card/Year/Month Report Filters

- Independent review kết luận đây không phải chỉ thêm query params: transaction
  phải join `account.creditCardId` và `statement.userCardId`, còn cashback/fee
  join trực tiếp `userCardId`.
- Cần user/product chốt trước implementation:
  1. Filter card/owner có loại real-money transaction không có card hay chỉ giữ
     credit expense + statement payment liên quan card?
  2. `netAssets`/`creditDebtBalance` khi report đã lọc card là balance workspace,
     balance card-scoped hay phải bỏ khỏi response?
  3. Card inactive có giữ trong historical report không; orphan source sau delete
     card có tính workspace-wide không?
  4. FR-08 yêu cầu zero-total matching cards: có mở rộng DTO thêm
     `matchedCards[]` (id/owner/name/metrics) không?
- Khuyến nghị: giữ active/inactive history; card+owner là giao của hai filter;
  card-scoped report loại real-money độc lập và orphan; thêm `matchedCards[]`.
  Đây là read-only slice nên chưa cần backup, nhưng không tự triển khai khi
  semantics balance/DTO chưa được duyệt.
- Next action: chờ quyết định product/user, sau đó freeze `FinancialReportQuery`
  shared contract trước REST/MCP/frontend implementation.

### Completed checkpoint: Fee/Cashback REST command-service boundary

- Independent review: bounded write-path extraction được duyệt có điều kiện; giữ
  nguyên validation, workspace/card/period filters, Mongo operators/options và
  response compatibility. Không mở MCP write, preview-confirm, idempotency,
  audit hay transaction trong slice này.
- Changed write-set: `FeeCommandService` sở hữu card fee và Fee Center
  create/update/delete; `MonthlyCashbackCommandService` sở hữu cashback
  upsert/delete. Ba REST modules chỉ tạo trusted `browserServiceContext`, gọi
  command service và giữ envelope/message legacy. `users` dependency là bắt
  buộc để mutation không bỏ qua identity revalidation.
- Behavior locked: card ownership được kiểm tra trước body validation; fee
  payment giữ positive safe integer/date/note rules; Fee Center giữ
  `userCardId: body.cardId` kể cả `undefined`; cashback giữ
  `PENDING|RECEIVED|REJECTED`, `actualAmount=null` cho non-RECEIVED,
  `receivedAt` đầu tiên và unique workspace/card/period upsert semantics.
- Acceptance evidence: command-service unit tests và route regression tests
  pass; backend `npm run validate` pass (119 tests, typecheck, lint và build);
  `git diff --check` pass.
- Database impact: write operations hiện hữu được gọi từ application service,
  nhưng không đổi schema/index/migration, không chạy data rewrite hay DB
  migration; theo nguyên tắc đã thống nhất không cần Kubernetes backup.
- Residual risk: REST writes vẫn là compatibility commands chưa có generic
  preview/one-time confirmation/idempotency reservation/append-only audit;
  MCP chưa expose fee/cashback mutation. Payment state machine và card
  delete/merge vẫn là decision gates.
- Commit/push: `e153588` đã push thành công lên `origin/master`.

### Completed checkpoint: Calendar Subscription command boundary

- Independent review: bounded command extraction được duyệt; chỉ chuyển POST
  create và DELETE revoke sang service. GET list, token feed, statement
  projection và `lastAccessedAt` write giữ nguyên trong route để không mở rộng
  scope.
- Changed write-set: `CalendarSubscriptionService.create/revoke` dùng trusted
  `ServiceContext`; route adapters gọi `browserServiceContext`, không còn
  ghi `CalendarSubscriptionModel.create/updateOne` trực tiếp cho management
  commands. Token vẫn random 32-byte base64url, chỉ lưu SHA-256 hash và raw
  token chỉ xuất hiện trong `subscriptionPath` response.
- Compatibility decision: thành công vẫn `201 {data: ...}` và `200
  {data:{revoked:true}}`; user inactive/locked/moved bị trusted context chặn
  bằng `401 UNAUTHENTICATED` thay cho legacy POST `403 ACCOUNT_UNAVAILABLE`.
  Đây là policy thống nhất có chủ đích và có thể rollback bằng code.
- Acceptance evidence: service unit tests, route delegation/context tests và
  existing feed tests pass; backend `npm run validate` pass (123 tests,
  typecheck, lint và build); `git diff --check` pass.
- Database impact: chỉ refactor các create/revoke writes hiện hữu; không đổi
  schema/index/migration, không data rewrite và không cần Kubernetes backup.
- Residual risk: GET management surface vẫn direct-model compatibility read;
  feed giữ fire-and-forget `lastAccessedAt`; session version/revocation và
  generic mutation idempotency/audit chưa mở.
- Commit/push: `8701e02` đã push thành công lên `origin/master`.

### Completed checkpoint: Notes trusted mutation context

- Independent review: low-risk identity-boundary slice được duyệt; chỉ đổi
  POST `/api/notes`, giữ nguyên date/content validation, workspace upsert/remove
  semantics và response. GET đã dùng trusted context từ slice trước.
- Changed write-set: notes POST tạo `browserServiceContext` một lần trước khi
  validate/write, dùng `context.workspaceId`; loại bỏ `sessionFromRequest` khỏi
  mutation adapter. `NotesRepository` vẫn là persistence seam hiện hữu, không
  thêm Notes MCP command hay DTO mới.
- Acceptance evidence: notes/context focused tests pass; backend
  `npm run validate` pass (124 tests, typecheck, lint và build); moved-workspace
  user bị `401` trước repository write; `git diff --check` pass.
- Database impact: chỉ thêm user revalidation lookup; notes upsert/remove giữ
  nguyên persistence, không schema/index/migration/data write và không cần
  Kubernetes backup.
- Residual risk: NotesRepository vẫn là compatibility repository gọi trực tiếp
  từ route; malformed non-empty date tiếp tục AS-IS. Các profile/workspace/card/
  payment mutations còn gate riêng.
- Commit/push: `4bdea9e` đã push thành công lên `origin/master`.

### Completed checkpoint: Profile trusted mutation context

- Independent review: bounded Access & Tenancy adapter slice được duyệt; chỉ
  đổi PATCH `/api/profile`, giữ nguyên forbidden-field/displayName validation,
  `AuthRepository.updateUser` và response `{user}`.
- Changed write-set: profile PATCH tạo `browserServiceContext` trước validation
  và update, dùng `context.userId`; user inactive/locked/moved workspace bị
  `401` trước repository write. Không đổi auth repository/model/schema/MCP.
- Compatibility decision: active success và error codes cho payload hợp lệ giữ
  nguyên; stale identity nhận `401 UNAUTHENTICATED` thay vì legacy route có thể
  tiếp tục parse payload và trả `403/400`. Đây là trusted-context policy có chủ
  đích, rollback chỉ bằng code.
- Acceptance evidence: profile/workspace/context focused tests và backend
  `npm run validate` pass (124 tests, typecheck, lint và build); update nhận
  đúng user id/normalized display name, moved user không gọi update; `git
  diff --check` pass.
- Database impact: chỉ giữ nguyên `AuthRepository.updateUser` persistence path,
  thêm user revalidation lookup; không schema/index/migration/data rewrite và
  không cần Kubernetes backup.
- Residual risk: race user bị move/lock sau context check trước repository
  update; session version/revocation và admin/workspace/card/payment mutations
  còn slice riêng.
- Commit/push: `e54d8da` đã push thành công lên `origin/master`.

### Completed checkpoint: Workspace owner trusted mutation context

- Independent review: bounded Access & Tenancy auth-boundary slice được duyệt;
  chỉ đổi PUT `/api/workspace/owner`, giữ target owner validation, Workspace
  upsert/update fields và response envelope.
- Changed write-set: route tạo `browserServiceContext`, revalidate current
  user/workspace/role rồi kiểm tra `context.role === "admin"`; target owner
  phải active, unlocked và cùng trusted workspace. `requireAdmin`/cookie role
  không còn là authority duy nhất cho mutation này.
- Compatibility decision: active non-admin vẫn `403 FORBIDDEN`; stale admin
  hoặc inactive/locked/moved user bị trusted context chặn `401` trước read/write.
  Owner target errors vẫn `400 INVALID_WORKSPACE_OWNER`, success vẫn
  `{data:{configured:true}}`.
- Acceptance evidence: owner route/context tests pass; backend
  `npm run validate` pass (125 tests, typecheck, lint và build); update filter,
  upsert options và no-write non-admin/demoted cases được kiểm tra; `git
  diff --check` pass.
- Database impact: giữ nguyên `WorkspaceModel.updateOne` persistence path,
  không schema/index/migration/data rewrite và không cần Kubernetes backup.
- Residual risk: race giữa context revalidation và workspace update; atomic
  conditional/transaction policy cùng session version còn decision gate.
- Commit/push: `7306806` đã push thành công lên `origin/master`.

### Completed checkpoint: Masterdata trusted admin context

- Independent review: bounded legacy masterdata auth-boundary slice được duyệt;
  GET/POST/PUT/DELETE banks và cardtypes giữ global collection semantics,
  duplicate validation, repository calls và response/envelope.
- Changed write-set: `registerMasterdataRoutes` nhận user repository; mọi GET
  tạo trusted browser context, mọi write revalidate current role và chỉ admin
  mới qua repository. Runtime composition truyền `authRepository`; không thêm
  `workspaceId` filter vì CAT-08 quy định masterdata global.
- Compatibility decision: active non-admin vẫn `403 FORBIDDEN`; stale/demoted/
  inactive/locked/moved identity bị chặn `401/403` trước repository access.
  Malformed IDs and repository response behavior không đổi.
- Acceptance evidence: masterdata duplicate/read/write tests, stale-admin no
  write test và REST runtime inventory pass; backend `npm run validate` pass
  (126 tests, typecheck, lint và build); `git diff --check` pass.
- Database impact: chỉ thêm auth user lookup trước các global repository writes;
  không schema/index/migration/data rewrite và không cần Kubernetes backup.
- Residual risk: legacy masterdata vẫn repository trực tiếp từ route, chưa có
  canonical command service, audit metadata hoặc MCP exposure.
- Commit/push: `38f4c34` đã push thành công lên `origin/master`.

### Completed checkpoint: Masterdata command-service boundary

- Requirement/GAP: masterdata đã có trusted admin context nhưng POST/PUT/DELETE
  vẫn giữ duplicate-check và repository calls trong REST adapter; Phase 1 cần
  một canonical command boundary mà không đổi CAT-08 global semantics.
- Independent review: GO cho bounded non-financial slice. `MasterdataCommandService`
  nhận trusted `ServiceContext`, enforce admin trước repository access, chuẩn hóa
  duplicate lookup cho banks/cardtypes và delegate create/update/remove; route
  chỉ tạo context, map duplicate message/status và response legacy.
- Compatibility: giữ nguyên collection, duplicate comparison, request payload,
  status/envelope/message, update/remove behavior và global scope. Không thêm
  workspace filter, audit/MCP tool, index, migration hay data rewrite.
- Acceptance evidence: command-service tests chứng minh non-admin fail-closed,
  normalized duplicate lookup, payload preservation và update/remove delegation;
  existing masterdata route tests được đưa vào curated backend suite. Backend
  `npm run validate` pass `103/103` với typecheck, lint và build; `git diff --check`
  pass. Jenkins build `314` pass curated `25/45/103`, publish image
  `9d9c976af2da`; Argo chart commit `6c3431d` reconcile `Synced/Healthy/Succeeded`,
  backend/frontend `1/1`, backend smoke `/health` và `/ready` `200`, MCP runtime
  vẫn `writerMode=read` với 11 query tools và không expose statement-payment mutation.
- Residual risk: masterdata vẫn global compatibility surface, chưa có audit
  metadata hoặc MCP exposure; đó là separate policy/use-case decision.
- Commit/push: application commit `85bbc17` đã push lên `origin/master`.

### Completed checkpoint: Admin users và audit trusted admin context

- Independent review: bounded Access & Tenancy auth-boundary slice được duyệt;
  giữ nguyên global admin semantics, user allowlist, audit filters, limit clamp
  và response envelopes. Không thêm workspace filter cho user list/audit vì đây
  là admin surface toàn hệ thống.
- Changed write-set: `GET /api/admin/users`,
  `PATCH /api/admin/users/:id` và `GET /api/admin/audit-logs` dùng helper
  `adminContext` dựa trên `browserServiceContext`; current user/active/locked/
  workspace và role được revalidate trước `listUsers`, `updateUser` hoặc audit
  collection query. `requireAdmin` cookie-only không còn là authority duy nhất.
- Compatibility decision: active non-admin và demoted admin vẫn `403 FORBIDDEN`;
  inactive/locked/moved identity bị chặn `401 UNAUTHENTICATED` trước downstream.
  PATCH vẫn chỉ cho phép `displayName`, `role`, `workspaceId`; audit vẫn map
  `_id` thành `id` và giữ query semantics hiện hữu.
- Acceptance evidence: admin route tests pass cho active admin, normalized PATCH,
  audit filters, non-admin, demoted/inactive/locked/moved session; backend
  `npm run validate` pass (128 tests, typecheck, lint và build); `git diff --check`
  pass.
- Database impact: chỉ thêm authoritative user lookup trước các list/update/read
  hiện có; không schema/index/migration/data rewrite và không cần Kubernetes
  backup.
- Residual risk: global admin operations vẫn có race giữa context revalidation và
  downstream action; session version/revocation, atomic role/version guard và
  audit write policy còn decision gate. Đây chưa phải generic command/audit guard.
- Commit/push: `3cab90d` đã push thành công lên `origin/master`.

### Completed checkpoint: Admin user query/command service boundary

- Requirement/GAP: `GET /api/admin/users` và `PATCH /api/admin/users/:id` đã có
  trusted admin context nhưng REST adapter vẫn trực tiếp gọi repository và giữ
  field normalization; Phase 1 cần canonical service boundary cho admin user
  operations mà không đổi global admin semantics.
- Independent review: GO cho bounded Access & Tenancy slice. `AdminUserService`
  nhận trusted `ServiceContext`, fail-closed non-admin trước repository access,
  chuẩn hóa các field `displayName`, `role`, `workspaceId` và delegate list/update;
  route chỉ revalidate context, gọi service và map response. Audit log path vẫn
  dùng `AdminAuditService` hiện hữu.
- Compatibility: giữ nguyên global user list, allowed update fields, trim/space
  normalization, max lengths, role/workspace validation, `USER_NOT_FOUND`, status
  và response envelopes. Không thêm workspace filter, schema/index/migration,
  data rewrite, audit mutation hoặc MCP surface.
- Acceptance evidence: focused service + route tests pass `5/5`; backend
  `npm run validate` pass `106/106` với typecheck, lint và build; shared
  `npm run validate` pass `25/25`; frontend typecheck/lint/integration `6/6`/build
  pass; `git diff --check` pass.
- Runtime evidence: Jenkins build `317` checkout đúng SHA `1c4fa24`, pass
  curated `25/45/106`, publish image `1c4fa24250fd`; chart commit `5061bbe`
  reconcile qua Argo `Synced/Healthy/Succeeded`, backend/frontend `1/1`, restart
  `0`. Backend smoke `/health` và `/ready` `200`; MCP runtime vẫn
  `writerMode=read`, 11 query tools và không expose statement-payment mutation.
- Database/operational impact: chỉ di chuyển authorization/normalization và
  repository delegation vào application service; không persistence behavior,
  schema/index/migration hay Kubernetes mutation.
- Residual risk: profile GET/PATCH và các private direct-model routes khác vẫn là
  các slice riêng; session version/atomic role guard và audit write policy còn
  decision gate.
- Commit/push: application commit `1fe15a2` và execution-plan update `1c4fa24`
  đã push thành công lên `origin/master`.

### Completed checkpoint: Catalog admin trusted admin context

- Independent review: bounded Card Catalog auth-boundary slice được duyệt với
  điều kiện production wiring truyền `AuthRepository`, không fallback cookie-only;
  catalog vẫn global và giữ nguyên audit/envelope/validation semantics.
- Changed write-set: `buildApp` nhận `authUsers` dependency ở cuối positional
  signature; `server.ts` khởi tạo `MongoAuthRepository` trước app và truyền vào.
  Bốn admin catalog routes dùng `browserActorContext`, revalidate signed session,
  active/locked/workspace và role trước list/create/update/provider update.
  `browserActorContext` trả `ServiceContext` tối thiểu cùng safe `Session` actor
  từ một authoritative lookup để audit không lấy email/role stale và không leak
  `passwordHash`; thiếu repository thì authenticated request fail-closed `503`.
- Compatibility decision: active non-admin/demoted admin `403`; inactive/locked/
  moved identity `401`; unauthenticated vẫn `401`. Giữ nguyên global catalog,
  `withLegacyAliases`, status `201`, duplicate/validation errors, audit events và
  `writeAudit` payload.
- Acceptance evidence: catalog/context focused tests pass; kiểm tra actor
  authoritative và single lookup; backend `npm run validate` pass (130 tests,
  typecheck, lint và build); `git diff --check` pass.
- Database impact: chỉ thêm user lookup trước các catalog reads/writes hiện hữu;
  không schema/index/migration/data rewrite và không cần Kubernetes backup.
- Residual risk: race giữa context revalidation và catalog write/audit insert;
  session version/atomic role guard, generic command idempotency và atomic audit
  policy còn decision gate.
- Commit/push: `214517a` đã push thành công lên `origin/master`.

### Completed checkpoint: Calendar email trusted identity context

- Independent review: bounded Engagement composition slice được duyệt; không mở
  rộng sang payment PATCH/transaction mutation. Recipient, projection, mail side
  effect, log masking và response/error contracts giữ nguyên.
- Changed write-set: calendar-email POST bỏ manual `sessionFromRequest`, user
  lookup và `serviceContextFromSession`; dùng `browserActorContext` một lần để
  lấy `ServiceContext` và authoritative actor email. Card/statement canonical
  query services tiếp tục là downstream source; browser/query/body recipient bị
  bỏ qua.
- Compatibility decision: cookie thiếu/sai và user không tồn tại/inactive/locked/
  moved đều `401 UNAUTHENTICATED` trước card/statement/mail; authoritative email
  sai format vẫn `400 ACCOUNT_EMAIL_UNAVAILABLE`; card/statement `404`, SMTP
  `503/502` và masked recipient không đổi.
- Acceptance evidence: focused calendar/context/transaction tests pass (15 tests),
  gồm authoritative email lookup đúng một lần và stale identity isolation; backend
  `npm run validate` pass (131 tests, typecheck, lint và build); `git diff --check`
  pass.
- Database impact: chỉ thay auth lookup/context adapter trước existing read/mail
  flow; không schema/index/migration/data rewrite và không cần Kubernetes backup.
- Residual risk: mail side effect vẫn không có idempotency/outbox; payment PATCH
  và legacy transaction mutation vẫn là decision gate riêng.
- Commit/push: `b01d714` đã push thành công lên `origin/master`.

### Completed checkpoint: Calendar Subscription list service

- Independent review: bounded read adapter/service extraction được duyệt; không
  đổi feed/token/create/revoke hoặc schema. GET management list giữ revoked rows,
  `createdAt DESC`, safe DTO và user/workspace scope hiện hữu.
- Changed write-set: thêm `CalendarSubscriptionService.list(ctx)` với query
  `{userId: ctx.userId, workspaceId: ctx.workspaceId}` và sort `{createdAt:-1}`;
  GET route dùng `browserServiceContext`, không còn `sessionFromRequest` hay
  direct model access trong adapter. Feed vẫn dùng model riêng để giữ
  `lastAccessedAt` compatibility write.
- Compatibility decision: unauthenticated vẫn `401`; active identity trả cùng
  `{data:[...]}` và safe fields; inactive/locked/moved/nonexistent user bị
  trusted context chặn `401` trước list query thay vì list theo stale session.
- Acceptance evidence: route delegation + service query/sort/DTO tests pass;
  backend `npm run validate` pass (132 tests, typecheck, lint và build);
  `git diff --check` pass.
- Database impact: chỉ chuyển read query vào application service, không
  schema/index/migration/data write và không cần Kubernetes backup.
- Residual risk: feed `lastAccessedAt` vẫn fire-and-forget compatibility write;
  subscription list chưa pagination/limit và generic audit/idempotency không
  thuộc slice này.
- Commit/push: `74c76bd` đã push thành công lên `origin/master`.

### Completed checkpoint: Calendar Subscription contract parity

- Independent review: bounded shared-contract slice được duyệt với điều kiện
  normalize Mongo `Date` thành ISO trước runtime parse; không MCP tool, không DB
  schema/data change. Safe DTO strict, không được chứa `tokenHash`/raw token.
- Changed write-set: shared export thêm `calendarSubscriptionSchema`, list/create
  schemas và DTO types; backend `safeCalendarSubscription` normalize timestamps,
  GET/POST parse canonical schemas; frontend client dùng shared types và runtime
  parser qua `calendarSubscriptionsCore.mjs`, không còn cast JSON thủ công.
- Compatibility decision: GET/POST envelopes/status, revoked history, one-time
  `subscriptionPath`, revoke behavior và feed/token secrecy giữ nguyên; malformed
  date/path/extra secret fields fail closed ở shared/backend/frontend boundary.
- Acceptance evidence: shared `npm run validate` pass (15 tests); backend
  `npm run validate` pass (132 tests, typecheck, lint và build); frontend
  typecheck/lint/test pass (77 unit + 6 integration) và production build pass;
  `git diff --check` pass.
- Database impact: chỉ đổi DTO serialization/validation và client parsing; không
  schema/index/migration/data rewrite, không cần Kubernetes backup.
- Residual risk: calendar feed vẫn giữ compatibility `lastAccessedAt` write;
  subscription command chưa có generic preview/idempotency/audit guard.
- Commit/push: `368333e` đã push thành công lên `origin/master`.

### Completed checkpoint: Masterdata GET contract parity

- Independent review: bounded read-only slice được duyệt; global collection
  semantics, authenticated user read, sort và root-array response giữ nguyên;
  POST/PUT/DELETE, MCP và DB schema/data nằm ngoài scope.
- Changed write-set: shared thêm strict `MasterBankDto` và `MasterCardTypeDto`
  list schemas; `MasterdataQueryService` nhận trusted context + repository,
  whitelist `_id/shortname/name/fullname/logo` (hoặc `_id/name/logo`) và chuẩn
  hóa `_id` thành string; GET routes parse canonical schemas; frontend pages
  dùng shared types và runtime parser/client thay cho cast JSON trực tiếp.
- Compatibility decision: `/api/banks` và `/api/cardtypes` vẫn trả root array,
  giữ cache-busting query, sort `shortname ASC`/`name ASC`, global scope và
  mutation behavior; persistence/secret fields bị loại khỏi wire DTO và strict
  parser fail-closed.
- Acceptance evidence: shared `npm run validate` pass (16 tests); backend
  `npm run validate` pass (133 tests, typecheck, lint và build), sau final
  fail-closed tweak focused masterdata 3/3 pass; frontend typecheck/lint/test
  pass (79 unit + 6 integration) và production build pass; `git diff --check`
  pass.
- Database impact: chỉ thay read projection/DTO validation/client parsing;
  không schema/index/migration/data rewrite, không cần Kubernetes backup.
- Residual risk: legacy masterdata POST/PUT/DELETE vẫn dùng repository trực tiếp,
  chưa có shared command contract, generic preview/idempotency/audit guard.
- Commit/push: `1b7bde2` đã push thành công lên `origin/master`.

### Completed checkpoint: User/Profile contract parity

- Independent review: bounded identity read/response slice được duyệt; giữ
  trusted browser context, RBAC, allowlist và AuthRepository semantics; không
  chạm audit-log, MCP, schema/index/migration/data.
- Changed write-set: shared thêm strict `UserDto`/`userListSchema` với safe fields
  `id`, `email`, `role`, `workspaceId`, `displayName`, `active`, `lockedAt`;
  backend serialize `lockedAt` thành ISO UTC/null và parse profile GET/PATCH,
  admin users GET/PATCH; frontend profile, admin users, NavigationBar và
  catalog admin dùng runtime parser, bỏ các local response casts.
- Compatibility decision: envelopes `{user}`/`{users}`, profile/admin mutation
  allowlist, response/status và revalidation behavior giữ nguyên; `passwordHash`,
  cookie/session metadata và field lạ bị loại hoặc strict parser fail-closed.
- Acceptance evidence: shared `npm run validate` pass (17 tests); backend
  `npm run validate` pass (133 tests, typecheck, lint và build), focused admin/
  private tests 4/4 pass; frontend typecheck/lint/test pass (81 unit + 6
  integration) và production build pass; `git diff --check` pass.
- Database impact: chỉ thay response serialization/schema validation/client
  parsing; không schema/index/migration/data rewrite, không cần Kubernetes backup.
- Residual risk: email chỉ yêu cầu non-empty để tương thích legacy; audit-log
  vẫn là compatibility projection riêng và generic command guard chưa mở.
- Commit/push: `1485192` đã push thành công lên `origin/master`.

### Completed checkpoint: Auth Session contract parity

- Independent review: bounded authentication response slice được duyệt; chỉ
  chuẩn hóa transport DTO, giữ nguyên cookie, status, audit, password/token
  secrecy, authentication/revalidation và repository semantics; không DB
  schema/index/migration/data, không MCP.
- Changed write-set: shared thêm strict `AuthSessionDto`/list schema với đúng
  `email`, `role`, `workspaceId`; backend login/register/me/bootstrap parse cùng
  schema; frontend login/register parse success envelope trước redirect.
- Compatibility decision: `{user}` cho login/register/me, `{users}` cho
  bootstrap, cookie headers, 200/201/status và error responses giữ nguyên;
  `userId`, `displayName`, `active`, `lockedAt`, `passwordHash` và field lạ
  không được lộ. Safe DTO được parse trước success audit/set-cookie ở login/
  register; bootstrap parse từng item trước final audit.
- Acceptance evidence: shared `npm run validate` pass (18 tests); backend
  `npm run validate` pass (133 tests, typecheck, lint và build); frontend
  typecheck/lint/test pass (83 unit + 6 integration) và production build pass;
  `git diff --check` pass.
- Database impact: chỉ thêm runtime schema/response validation và frontend
  parser; không schema/index/migration/data rewrite, không cần Kubernetes backup.
- Residual risk: auth session contract không bao gồm frontend consumer cho
  `/api/auth/me`/bootstrap vì hiện chưa có caller riêng; generic session
  version/revocation vẫn là DB decision gate.
- Commit/push: `b75fb28` đã push thành công lên `origin/master`.

### Completed checkpoint: Report date-range contract parity

- Independent review: bounded read slice được reviewer duyệt; chỉ chuẩn hóa
  `from/to`, không mở rộng owner/card/account/category filter và không thay
  semantics của `credit-statements`.
- Changed write-set: shared thêm strict `reportDateSchema`,
  `reportDateRangeSchema` và REST-compatible `resolveReportDateRange`;
  Financial Report service, REST summary, MCP manifest/tool và Frontend finance
  client dùng cùng calendar-date/order validation. REST giữ mặc định UTC current
  month-to-today; MCP yêu cầu đủ `from/to`; REST reject query key ngoài range
  bằng `400 INVALID_DATE_RANGE`.
- Acceptance evidence: independent reviewer trả `GO`; shared `npm run validate`
  pass (20 tests); backend `npm run validate` pass (136 tests, typecheck, lint và
  build); focused report/MCP tests pass (13 tests), frontend `typecheck`, `lint`,
  `test` (83 unit + 6 integration) và production build pass; `git diff --check`
  pass.
- Database impact: chỉ runtime contract/adapter validation và tests; không
  schema/index/migration/data write, không cần Kubernetes backup.
- Residual risk: `credit-statements` vẫn giữ range validation AS-IS; owner/card/
  account/category/year/month filters còn decision gate do chưa chốt balance,
  orphan/inactive-card và zero-total semantics. Unknown summary query params
  trước đây bị bỏ qua, nay trả 400 có chủ đích để tránh filter giả.
- Commit/push: `88d0f53` đã push thành công lên `origin/master`.

### Completed checkpoint: Credit-statement report contract parity

- Independent review: bounded projection slice được reviewer duyệt; giữ raw
  `paymentStatus`, không thêm `effectivePaymentStatus`, không đổi
  optional/all-time range semantics và không mở MCP mutation/tool mới.
- Changed write-set: shared thêm strict `CreditStatementReportDto`/list
  schema, tái sử dụng ISO date và `statementPaymentStatusSchema`;
  FinancialReportService parse projection trước khi trả; REST giữ `{data}`
  envelope và parse list; Frontend `getCreditStatements` runtime-parse
  cùng list contract.
- Acceptance evidence: independent reviewer trả `GO`; shared `npm run validate`
  pass (21 tests); backend `npm run validate` pass (138 tests, typecheck,
  lint và build), focused report tests 8/8 pass; frontend `typecheck`,
  `lint`, `test` (83 unit + 6 integration) pass; `git diff --check`
  pass.
- Database impact: chỉ schema runtime/DTO parsing và tests; không model,
  schema/index/migration/data write, không cần Kubernetes backup.
- Residual risk: payment PATCH/state machine vẫn legacy; `credit-statements`
  vẫn không có MCP tool và chỉ expose projection fields, không có card owner/
  transactions/workspace identity; full report filters vẫn decision gate.
- Commit/push: `72be84c` đã push thành công lên `origin/master`.

### Completed checkpoint: Shared calendar-date contract parity

- Independent review: hai reviewer độc lập trả `GO`; phạm vi được giữ ở
  shared runtime contract, không mở rộng route/query/payment hay persistence.
- Changed write-set: thêm `shared` `isoDateSchema` làm implementation duy nhất
  cho calendar date hợp lệ; transaction input/read, statement, report và fee
  DTO dùng cùng validator. `reportDateSchema` giữ nguyên như alias tương thích.
  Ngày có format đúng nhưng không tồn tại (ví dụ `2026-02-30`) bị reject
  fail-closed.
- Acceptance evidence: shared `npm run validate` pass (22 tests); backend
  `npm run validate` pass (138 tests, typecheck, lint và build); frontend
  `typecheck`, `lint`, `test` (83 unit + 6 integration) và production build
  pass; `git diff --check` pass.
- Database impact: chỉ runtime schema/type và tests; không model,
  schema/index/migration/data write, không cần Kubernetes backup.
- Residual risk: catalog và một số portfolio date fields còn validator riêng;
  audit dữ liệu persisted cũ chứa ngày không hợp lệ và chuẩn hóa các field đó
  thuộc follow-up riêng. Slice này không đổi payment state, report filter
  semantics hay dữ liệu đã lưu.
- Commit/push: `95c8db0` đã push thành công lên `origin/master`.

### Deferred checkpoint: Catalog/Portfolio calendar-date hardening

- Independent review: phạm vi code nhỏ và acceptance tests rõ, nhưng không được
  commit trước khi có quyết định/audit dữ liệu persisted.
- Proposed write-set (chưa áp dụng): dùng shared `isoDateSchema` cho Catalog
  `sourceCheckedAt` và Portfolio `statementDate`/`paymentDueDate` nullable.
- Blocking risk: `cardDtoFromDocument()` parse trực tiếp persisted card DTO;
  record legacy như `31/07/2026` có thể làm endpoint Cards fail toàn bộ sau khi
  validator strict hơn. Cần audit canonical ISO/null trong DB và phương án
  normalization/migration + backup trước rollout; không tự ý thay đổi DB.
- Current state: code đã hoàn nguyên, không có commit/push cho follow-up này.
- Next action: chỉ mở lại sau khi có DB data decision/backup plan; tiếp tục một
  slice không làm thay đổi persisted-data acceptance trong lúc chờ.

### Completed checkpoint: Financial transaction list query parity

- Independent review: reviewer trả `GO`; REST, MCP và Frontend cùng dùng một
  shared query contract, không sửa `FinancialTransactionService.list` hoặc
  persistence behavior.
- Changed write-set: shared thêm `financialTransactionListQuerySchema` strict
  cho `from/to/accountId/categoryId`, trim id/category, reject ngày không tồn
  tại, range đảo và unknown filters. REST parse thành `400
  INVALID_TRANSACTION_FILTER`; MCP `list_transactions` truyền query canonical
  và reject legacy `date`; Frontend builder parse schema và tạo URLSearchParams.
- Compatibility cleanup: xóa `TransactionService.list` cùng
  `services/types/transaction.dto.ts` vì không còn consumer; giữ serializer
  statement cần cho payment compatibility adapter.
- Acceptance evidence: shared `npm run validate` pass (23 tests); backend
  `npm run validate` pass (141 tests, typecheck, lint và build); frontend
  `typecheck`, `lint`, `test:unit` (84 tests), `test:integration` (6 tests) và
  production build pass; `git diff --check` pass.
- Database impact: chỉ contract/adapter/client cleanup và tests; không model,
  schema/index/migration/data write, không cần Kubernetes backup.
- Residual risk: MCP manifest giữ `date: z.never().optional()` như explicit
  compatibility guard để SDK không silently strip legacy input; Frontend URL
  builder mới được source-level tested, chưa có fetch-mock assertion riêng.
- Commit/push: `451b95c` đã push thành công lên `origin/master`.

### Completed checkpoint: ProfileService application boundary

- Requirement/GAP: Phase 1 Access & Tenancy cần chuyển profile GET/PATCH khỏi
  REST adapter để use case có một application service canonical, vẫn giữ trusted
  browser context và User/Profile contract parity.
- Independent review: bounded non-financial slice; `ProfileService` nhận
  `ServiceContext`, chỉ dùng trusted `context.userId`, fail-closed khi user
  không tồn tại và giữ nguyên allowlist/normalization/error behavior. REST route
  chỉ tạo context, gọi service và parse envelope `{user}`.
- Changed write-set: thêm `backend/src/services/profile-service.ts` và
  `backend/src/services/user-profile-policy.ts`; profile route bỏ helper
  `displayName`, các lệnh gọi trực tiếp `findUserById`/`updateUser` và business
  validation.
  `AdminUserService` dùng chung policy để không còn hai implementation
  normalize `displayName`; curated backend test thêm `profile-service.test.ts`.
- Cleanup evidence: `rg` xác nhận chỉ còn một `normalizeDisplayName` trong
  service policy; route không còn profile repository call/business rule; không
  có adapter/test legacy chỉ phục vụ path cũ cần xóa.
- Compatibility decision: giữ nguyên `{user}` envelope, trusted identity
  revalidation, `USER_NOT_FOUND`, `FORBIDDEN_PROFILE_FIELD`,
  `INVALID_DISPLAY_NAME`/`INVALID_REQUEST`, trim/space normalization và giới
  hạn 80 ký tự. Không thêm MCP surface, không đổi schema/model/persistence.
- Acceptance evidence: shared `npm run validate` pass (25 tests); backend
  `npm run validate` pass (111 curated tests, typecheck, lint và build); focused
  Profile/Admin/private-context tests pass (10 tests); frontend typecheck, lint,
  integration (6 tests) và production build pass; `git diff --check` pass.
- Database/operational impact: chỉ di chuyển validation và repository
  delegation vào service; không DB/schema/index/migration/data rewrite, không
  Kubernetes mutation. Rollback là revert application code trong batch.
- Residual risk: AuthRepository vẫn là persistence seam của Access & Tenancy;
  session version/atomic role guard và các private direct-mutation routes khác
  còn GAP riêng. Candidate Jenkins/Argo gate được giữ cho sau push cuối batch;
  chưa trigger hoặc mutate CI/CD/Kubernetes trong local validation.
- Commit/push: checkpoint này được đóng trong final batch commit chứa chính
  entry này; SHA và origin verification là evidence của candidate gate sau push.

### Completed checkpoint: NotesService application boundary

- Requirement/GAP: Notes GET/POST đã có trusted browser context nhưng REST
  adapter vẫn gọi `NotesRepository` trực tiếp và giữ date/content rule; cần một
  canonical service boundary mà không đổi Notes compatibility semantics.
- Independent review: bounded non-financial slice. `NotesService` nhận trusted
  `ServiceContext`, luôn scope bằng `context.workspaceId`, giữ validation và
  blank-content delete behavior; route chỉ tạo context, gọi service và trả
  envelope/legacy response.
- Changed write-set: thêm `backend/src/services/notes-service.ts`, route bỏ
  repository calls và business rule; curated backend thêm
  `tests/notes-service.test.ts`.
- Cleanup evidence: `rg` xác nhận `notes-routes.ts` không còn `list/upsert/remove`
  repository call; các thao tác persistence chỉ còn trong `NotesService` và
  repository implementation. Không có legacy adapter/test chỉ phục vụ path cũ
  cần xóa.
- Compatibility decision: giữ `{message: "Đã xóa ghi chú trống"}`, trim content,
  missing-date `INVALID_REQUEST`, malformed non-empty date AS-IS, workspace
  isolation và không thêm MCP/DTO/persistence change.
- Acceptance evidence: focused Notes service + route tests pass `5/5`; backend
  `npm run validate` pass `114/114` với typecheck, lint và build; shared
  `npm run validate` pass `25/25`; frontend typecheck/lint/integration `6/6`/build
  pass; `git diff --check` pass.
- Database/operational impact: chỉ chuyển validation/delegation vào service;
  không DB/schema/index/migration/data rewrite và không Kubernetes mutation.
- Residual risk: NotesRepository vẫn là persistence seam hợp lệ; malformed
  non-empty date và các private direct-mutation routes khác còn GAP riêng.
- Commit/push: final Batch B commit `0713812` đã ghi source, tests và
  execution-plan checkpoint; remote verification đã pass.

### Completed checkpoint: NotificationService read projection boundary

- Requirement/GAP: notification REST adapter đã dùng canonical statement/card
  query services nhưng vẫn giữ limit clamp, status/title/message mapping trong
  route; cần một application service cho read projection mà không đổi contract.
- Independent review: bounded read-only slice. `NotificationService` nhận trusted
  `ServiceContext`, giới hạn query, batch-load hai canonical dependencies và map
  notification DTO; route chỉ revalidate browser context và delegate.
- Changed write-set: thêm `backend/src/services/notification-service.ts`, route
  bỏ query-service imports và projection business rules; curated backend thêm
  `tests/notification-service.test.ts`.
- Cleanup evidence: route không còn `StatementQueryService`/`CardQueryService`,
  limit/status/title/message logic; projection mapping chỉ còn trong service.
- Compatibility decision: giữ limit `1..100`, default `50`, paid/overdue/future
  status, orphan-card fallback, exact row fields và `{data,meta}` envelope.
  Không thêm MCP surface, không đổi shared DTO, schema hoặc persistence.
- Acceptance evidence: focused service + route tests pass `4/4`; backend
  `npm run validate` pass `116/116` với typecheck, lint và build; `git diff --check`
  pass. Shared/frontend gates của Batch B vẫn pass và không có file thuộc hai
  package bị thay đổi trong Batch C.
- Database/operational impact: read-only service composition, không DB/schema/
  index/migration/data rewrite và không Kubernetes mutation.
- Residual risk: notification projection vẫn phụ thuộc các canonical read services;
  pagination/semantic changes của statements là GAP riêng.
- Commit/push: final Batch C commit `08f7471` ghi source, tests và
  execution-plan checkpoint; remote verification đã pass.

### Completed checkpoint: Batch D candidate image and GitOps handoff

- Requirement/GAP: sau khi chuyển `/api/auth/me` sang authoritative actor
  boundary, cần chứng minh CI checkout đúng source, test đủ ba package, image
  immutable được publish và CD chỉ cập nhật desired state; không suy diễn
  rollout Kubernetes từ source push hoặc GitOps commit.
- Independent review: Jenkins build `324` checkout đúng SCM/branch/SHA
  `7e561331be910102a273940c253291fdcc4d8332`; curated tests pass shared
  `25/25`, frontend `45/45`, backend `117/117`; typecheck/lint/build và hai
  OCI image builds pass. Hai `skopeo copy` hoàn tất cho tags
  `card-credit/frontend:7e561331be91` và `card-credit/backend:7e561331be91`;
  build kết thúc `SUCCESS`.
- CD evidence: GitOps chart checkout và commit `e05d8ea` (`Deploy card-credit
  7e561331be91`) đã cập nhật `card-credit/values.yaml`. Đây là desired-state
  handoff, chưa phải runtime rollout evidence.
- CI limitation: quality publisher ghi nhận thiếu `reports/security/**`, JUnit
  và lcov coverage artifacts; đây là report limitation hiện tại, không biến
  thành security/runtime evidence. Không tự bật scanner hoặc sửa hạ tầng trong
  checkpoint này.
- Runtime status: tại thời điểm ghi nhận, Argo `card-credit` vẫn `Synced/Healthy`
  ở revision cũ `d713cdc90ae68fd1f409897ca841a5e91346dc0f`; chưa có candidate
  pod/image digest/health smoke evidence cho `7e561331be91`.
- Safety/residual: không scale/restart/patch Kubernetes, không sửa database,
  không chạy payment mutation/reversal và old MCP writer fence/drain vẫn là
  P0 decision gate.
- Commit/push: checkpoint này cần commit docs-only và push sau khi ghi nhận;
  không chờ Argo reconciliation trong batch local.

### Execution rules

- Mỗi feature chỉ được đánh dấu `DONE` sau khi có review độc lập, verification
  evidence, commit và push thành công.
- Nếu thay đổi persistent schema/index/migration, dừng trước khi apply để lập
  backup/recovery plan và xin review riêng; documentation/logic-only change
  không cần truy cập Kubernetes.
- Khi token gần hết, mục `Current checkpoint`, commit SHA, file write-set và
  `Next action` là điểm tiếp tục bắt buộc.

## 1. Kết quả cần đạt

Mục tiêu là một modular monolith có một nguồn business logic duy nhất ở backend.
Frontend và MCP là hai adapter ngang hàng:

- Frontend cung cấp UX, lấy browser session và gọi REST.
- MCP parse ý định, dùng fixed trusted context và gọi tool.
- REST route và MCP tool không tự tính nghiệp vụ; cả hai gọi cùng application
  service, dùng cùng contract và nhận cùng business DTO.
- MongoDB chỉ được truy cập qua repository/model phía backend.
- Một capability chỉ được coi là hoàn tất khi Backend, Frontend, MCP nếu
  applicable, test, migration và tài liệu đã đồng bộ.

Plan này triển khai các yêu cầu TO-BE `INT-01..INT-10` trong
[SRS](SRS.md#42-kiến-trúc-tích-hợp-mục-tiêu) và xử lý các `GAP-*` đã phát hiện.

## 2. Quyết định kiến trúc

### 2.1 Một use case, một service

```text
HTTP route ----+
MCP tool ------+--> canonical input --> application service --> domain/repository
Job -----------+                           |
                                            +--> canonical DTO / domain error
```

Route/tool/job chỉ được làm năm việc:

1. Xác thực transport.
2. Tạo trusted `ServiceContext`.
3. Parse canonical input.
4. Gọi application service.
5. Map canonical result/error sang transport envelope.

Không được query Mongoose hoặc lặp lại formula/state transition trong adapter.

### 2.2 Contract source of truth

`shared/` sẽ sở hữu các contract framework-neutral theo capability:

```text
shared/src/
  common/          error codes, pagination, ISO date, safe VND primitives
  access/          profile/session DTO
  portfolio/       catalog/card DTO and commands
  ledger/          account/transaction DTO and commands
  credit/          statement/payment DTO and commands
  benefits/        cashback/fee DTO and commands
  insights/        budget/report/query DTO
  engagement/      notification/calendar DTO
```

Contract runtime dùng Zod 4 trong package `shared` để backend REST, MCP và
frontend response parsing import cùng schema; TypeScript type được infer hoặc
export từ chính schema đó. Business DTO không chứa REST envelope hoặc MCP
`content`.

Mỗi contract phải có:

- input/query/command type;
- output DTO;
- enum và error code;
- runtime validator hoặc schema framework-neutral;
- contract version khi cần compatibility;
- fixture dùng chung cho backend, browser client và MCP schema test.

Không tạo một type gần giống trong `frontend/types`, `frontend/lib/api` hoặc
`backend/src/mcp`. Adapter được phép có view model cục bộ nhưng view model phải
được map từ canonical DTO và không chứa business calculation.

### 2.3 Query và command

- Query là read-only, idempotent và trả canonical DTO.
- Command thay đổi state phải định nghĩa validation, authorization, concurrency,
  audit và idempotency.
- MCP command luôn dùng `preview -> explicit human confirmation -> execute`.
- Browser command rủi ro cao như payment, merge, delete hoặc import phải gọi cùng
  preview/execute service. Browser có thể dùng REST endpoint riêng cho UX nhưng
  không được có business path riêng.
- Preview không ghi business data/side effect, resolve resource trong workspace
  và trả `previewId`, normalized input, affected resources, before/after
  projection, warning, contract version và expiry.
- Preview/confirmation phải bind operation, actor/channel, workspace, canonical
  payload hash, resource ID/version, nonce và expiry; không ký raw
  `JSON.stringify` thiếu canonicalization.
- AI echo lại confirmation token không tự động được coi là human confirmation.
  MCP host/UI phải tạo one-time confirmation receipt sau hành động rõ ràng của
  người dùng.
- Execute phải reauthorize, revalidate/recalculate, kiểm tra resource version,
  consume confirmation một lần, reserve idempotency key và ghi result ổn định
  khi retry.
- Idempotency record là infrastructure dùng chung, không mang tên MCP; unique
  theo workspace/operation/key, có state `PENDING|COMPLETED|FAILED` và payload
  hash. Business write và completed receipt phải cùng transaction khi có thể.
- Audit là append-only record riêng, gồm actor/channel, workspace, operation,
  endpoint/tool, correlation/preview ID, resource, outcome và error code. Không
  coi idempotency receipt là audit và không lưu raw secret/sensitive payload.

### 2.4 Trusted context

```ts
type ServiceContext = {
  userId: string;
  workspaceId: string;
  role: "admin" | "user";
  channel: "browser" | "mcp" | "job";
  correlationId: string;
};
```

- Browser context được tạo từ session đã kiểm tra expiry và reload user state.
- MCP context được tạo từ server configuration, không có tenant/user argument.
- Job context dùng identity cố định và scope rõ ràng.
- Service không nhận Fastify request/reply, cookie, Bearer token hoặc raw AI
  arguments ngoài canonical input.

### 2.5 Source of truth tài chính

- `Account` + `FinancialTransaction`: balance, personal spending, real-money
  cash flow, debt impact, receivable và repayment.
- `CardStatement`: statement period và lifecycle.
- `MonthlyCardCashback`: cashback ngân hàng theo tháng.
- `CardFeePayment`: phí thẻ thực tế. Category cashback/refund không tiếp tục
  được ghi vào fee collection sau khi migration policy được duyệt.
- `CreditCard`: card snapshot và operational configuration.

Derived read model được phép cache/materialize nhưng không trở thành write
authority thứ hai.

## 3. Mô hình delivery theo vertical slice

Mọi task implementation phải dùng cùng template:

| Bước | Deliverable bắt buộc |
|---|---|
| 1. Contract | Canonical input/output/error, examples và compatibility decision |
| 2. Domain | Invariant/formula/state transition thuần và unit test |
| 3. Application | Query/command service nhận `ServiceContext` và canonical input |
| 4. Persistence | Workspace/parent scope, index, atomicity, migration và rollback |
| 5. REST | Thin adapter, session context, canonical validation/envelope |
| 6. MCP | Thin tool, fixed context, same service; preview/confirm cho mutation |
| 7. Frontend | Typed client + UI states; không tự tính authoritative value |
| 8. Verification | Contract, parity, workspace, integration và E2E test |
| 9. Documentation | SRS, OpenAPI/MCP inventory, compatibility/removal ledger |

Không merge một slice ở trạng thái “backend done, UI/MCP làm sau” trừ khi
capability được đánh dấu API-only có lý do và acceptance cụ thể.

## 4. Roadmap phụ thuộc

```text
Phase 0 Contract freeze
    |
Phase 1 Access + contract foundation
    |
Phase 2 Card Portfolio integrity
    |
Phase 3 Financial Ledger
    |
Phase 4 Credit Billing & Settlement
    |
Phase 5 Benefits & Fees
    |
Phase 6 Financial Planning
    |
Phase 7 Reporting & Insights
    |
Phase 8 Engagement
    |
Phase 9 Compatibility removal + contract automation
    |
Phase 10 Release validation
```

Card Portfolio đi trước Credit Billing & Settlement vì CREDIT account và statement cần
card parent đáng tin cậy. Financial Ledger đi trước payment/report vì mọi adapter
phải đọc cùng transaction source.

## 5. Kế hoạch thực hiện

### Phase 0 — Freeze contract và lập compatibility ledger

**Mục tiêu**: biết chính xác use case nào canonical, use case nào legacy và điều
kiện xóa compatibility path.

**Công việc**:

- Duyệt SRS theo tám business capability và hai nhóm cross-cutting; gắn owner
  cho từng requirement/GAP.
- Lập inventory `UI route -> browser client -> HTTP route -> service -> model ->
  MCP tool -> tests`.
- Đánh dấu contract canonical, compatibility hoặc dead cho từng path.
- Chốt envelope `{data, meta?}` và stable error envelope.
- Chốt schema strategy trong `shared/` và naming cho query/command/DTO.
- Lập ADR cho session policy, workspace join policy, card delete/merge policy,
  payment reversal và cashback/fee source of truth.

**Exit criteria**:

- 100% private runtime route và MCP tool nằm trong inventory.
- Mỗi compatibility path có owner, consumer, telemetry/test và removal phase.
- Không còn quyết định P0/P1 chưa có owner trước khi sửa data path.

**Rollback**: documentation-only; revert inventory/ADR nếu chưa được duyệt.

### Phase 1 — Access & Tenancy và contract foundation

**Mục tiêu**: mọi adapter nhận trusted context và dùng shared contract.

**Backend**:

- Thêm session expiry/version và revalidate user active/locked/role/workspace.
- Không cho public register tự join workspace tùy ý; áp dụng create-workspace hoặc
  invite/approved join policy theo ADR.
- Tạo context factory riêng cho browser, MCP và job.
- Tạo shared primitives: ISO date, safe integer VND, pagination, error envelope,
  actor/channel và idempotency metadata.
- Thiết kế generic preview/confirmation, idempotency reservation và append-only
  audit contracts; không tiếp tục coi `McpMutationModel` là audit log.
- Chuẩn hóa error mapping mà không phá client hiện tại; compatibility mapper có
  deprecation test.

**Frontend**:

- Mở rộng middleware guard cho toàn bộ private UI.
- Dùng một auth/profile client và xử lý 401/403 thống nhất.
- Không suy quyền từ cookie payload cho authorization; UI role chỉ dùng để ẩn/
  hiện control.

**MCP**:

- Validate MCP configured user còn active và đúng workspace trước tool execution.
- Tạo `ServiceContext.channel="mcp"`; không nhận user/workspace trong schema.

**Verification**:

- Session expiry, lock/revoke và stale role/workspace tests.
- Register/join workspace authorization tests.
- Contract fixtures chạy ở shared/backend/frontend/MCP.
- Cross-workspace tests cho cả browser và MCP context.

**Exit criteria**:

- Đóng `GAP-SEC-01`, `GAP-SEC-02`, `GAP-WEB-01`.
- Không adapter nào tự dựng trusted identity từ request payload.

### Phase 2 — Card Portfolio integrity

**Mục tiêu**: card/catalog có service canonical và mutation không tạo orphan.

**Backend**:

- Extract `CatalogQueryService`, `CardQueryService`, `CardCommandService`.
- Card DTO canonical thay thế alias mapping rải rác.
- Chọn và implement `RESTRICT`, `CASCADE` hoặc `REASSIGN` cho card delete.
- Duplicate merge phải preview toàn bộ affected account/statement/transaction/
  cashback/fee/reminder và execute atomic theo policy.
- Validate CREDIT account link cùng workspace/card active.
- Đã đưa catalog startup sync về explicit operator-controlled policy; readiness
  chỉ báo tình trạng, không silent write baseline. CLI import vẫn yêu cầu dry-run
  và production override có chủ đích.

**Frontend**:

- Card list/create/update/delete/merge dùng typed canonical client.
- Delete/merge UI hiển thị preview và affected resource count.
- Loại view fallback dựa trên `monthlyData` khỏi authoritative debt view.

**MCP**:

- `compare_cards` gọi `CardQueryService` và trả cùng Card DTO.
- Chưa mở card mutation cho MCP cho tới khi preview/execute service và audit đạt
  exit criteria.

**Data/migration**:

- Audit orphan và duplicate hiện có trước apply.
- Migration có backup, dry-run, deterministic mapping và reconciliation count.

**Exit criteria**:

- Đóng `GAP-DATA-01`, `GAP-ACC-01`, `GAP-OPS-01`.
- Frontend/REST/MCP card query parity test pass.

### Phase 3 — Financial Ledger

**Mục tiêu**: account/transaction là một vertical slice dùng được từ UI và MCP.

**Backend**:

- Canonicalize Account/Transaction query và command contracts.
- Route chỉ gọi `AccountService`/`FinancialTransactionService`; không manual DTO.
- Validate category/account/reimbursement parent trong workspace.
- Chốt policy `TRANSFER`: implement paired atomic entries hoặc loại khỏi public
  contract cho tới phase riêng.
- Implement generic `CommandPreview`, one-time confirmation,
  idempotency reservation và append-only audit trước khi nối write adapter.
- Browser và MCP create/import dùng cùng canonicalization, payload hash,
  command service và transaction boundary; adapter không tự tính preview.

**Frontend**:

- Thêm create account flow.
- Thay `AiTransactionModal` placeholder bằng transaction form/preview thật; AI
  entry nếu dùng phải gọi backend/MCP preview, không parse/tính locally.
- Dùng backend `impact` để render personal spending/cashflow/debt/receivable.
- Loading/error/empty/success và refresh sau mutation dùng chung client policy.

**MCP**:

- `list_accounts`, `list_transactions`, summary tools dùng canonical query DTO.
- Account/transaction preview-confirm gọi cùng command service với REST.
- Preview trả normalized input, backend-calculated impact, warnings và exact
  confirmation payload.

**Verification**:

- REST/MCP same-input parity fixtures.
- Preview không ghi; confirm retry không duplicate; mismatched payload conflict.
- Financial impact unit tests và transaction commit/abort integration tests.

**Exit criteria**:

- Accounts và Transactions UI không còn read-only/placeholder.
- Không còn duplicate account/transaction types ở Frontend/MCP.
- Đóng `GAP-MCP-01`: replay, đổi idempotency key, payload mismatch và concurrent
  confirm đều không thể tạo business effect lần hai; success/failure có audit.

### Phase 4 — Credit Billing & Settlement

**Mục tiêu**: một statement DTO và một state machine cho Dashboard, Payments,
REST, MCP, calendar và reminder.

**Backend**:

- Tạo `StatementQueryService` và `StatementPaymentCommandService`.
- Xóa legacy projection dùng `serviceFeeRate` như cashback rate; summary phải đọc
  persisted financial impacts theo semantics chuẩn.
- Validate action enum fail-closed; không default action lạ thành `PAID`.
- Payment preview phải trả statement balance, repayment account, affected
  cashflow/debt và current version.
- Execute dùng optimistic state guard + Mongo transaction + idempotency.
- Chốt reopen policy: compensating/reversal transaction hoặc cấm reopen sau khi
  payment đã settle; không để payment transaction tồn tại âm thầm.
- Dùng một outstanding amount definition cho account, statement, dashboard,
  notification, calendar và MCP.

**Frontend**:

- Payments/Card dashboard cho chọn real-money repayment account.
- Dùng payment preview trước confirmation; refresh statement/account/dashboard
  từ server result.
- Card detail hoặc statement detail canonical thay redirect nếu use case cần;
  không khôi phục legacy editor.

**MCP**:

- Read tools dùng `StatementQueryService`.
- Chỉ thêm preview/confirm payment tool sau khi browser flow và state-machine
  tests đạt exit criteria.

**Exit criteria**:

- Đóng `GAP-PAY-01`, `GAP-PAY-02`, `GAP-STM-01`.
- Month-end, overdue, paid, retry, concurrent payment và reopen fixtures pass qua
  REST và direct service/MCP adapter.

### Phase 5 — Benefits & Fees

**Mục tiêu**: cashback, refund, reimbursement và fee có source/model/report
semantics duy nhất.

**Backend**:

- Giữ rõ bốn loại: transaction cashback, monthly bank cashback, refund/
  reimbursement và actual card fee.
- Ngừng ghi `BANK_CASHBACK`/`PARTNER_REFUND` vào `CardFeePayment`; migrate theo
  ADR nếu có record hiện hữu.
- Tạo `BenefitQueryService`/`BenefitCommandService` và `FeeCommandService`.
- Report actual net benefit phải dùng:

  ```text
  monthlyBankCashbackActual - transactionServiceFees - actualPaidCardFees
  ```

- Không dùng transaction cashback để cộng lần hai; chỉ hiển thị reconciliation.

**Frontend**:

- Cashback và Fee Center dùng canonical DTO/status/category.
- Copy UI phải phản ánh đúng collection/report source; bỏ claim không đúng.
- Đưa Cashback vào navigation nếu capability được duyệt là user-facing.

**MCP**:

- Read summary dùng cùng Benefit/Report service.
- Mutation cashback/fee chỉ mở sau preview-confirm + audit; không có generic
  database mutation.

**Exit criteria**:

- Đóng `GAP-REP-01`.
- Report fixtures chứng minh không double count và khớp UI/MCP.

### Phase 6 — Financial Planning

**Mục tiêu**: category, budget và recurring trở thành vertical slice có write
flow hoàn chỉnh, không phụ thuộc report DTO.

**Backend**:

- Chuẩn hóa Budget DTO: `limitAmount`, `usedAmount`, `remainingAmount`,
  `usagePercent`, `status`.
- Category create/default seed, budget upsert/status và recurring lifecycle dùng
  canonical contract/service.
- Hoàn thiện recurring update/delete/generation policy hoặc ghi rõ API-only scope
  với owner và acceptance riêng.

**Frontend**:

- Fix Budget DTO và thêm create/update flow.
- Category/recurring UI được triển khai hoặc loại khỏi navigation/scope rõ ràng.

**MCP**:

- Chỉ expose planning query/command có use case được duyệt; mutation vẫn dùng
  generic preview-confirm infrastructure.

**Exit criteria**:

- Đóng `GAP-UI-01` và phần planning của `GAP-UI-03`.
- Budget/category/recurring DTO không còn shadow type ở Frontend/MCP.

### Phase 7 — Reporting & Insights

**Mục tiêu**: dashboard, report, cash-flow và export dùng cùng canonical read
model/filter, không sở hữu write collection riêng.

**Backend**:

- Chốt distinction giữa activity-in-range và balance-as-of; net assets/debt phải
  tính tới as-of date thay vì chỉ cộng transaction trong range.
- Tạo report filter canonical cho date range, owner, card, account, category.
- JSON export gọi cùng query service, không tạo report path riêng.
- Dashboard, Cards, reports và MCP summary dùng cùng Account/Statement/Benefit
  projections đã chuẩn hóa ở các phase trước.

**Frontend**:

- Reports đọc URL filter, hỗ trợ owner/card/date và export canonical JSON.
- Dashboard, Cards và Reports dùng cùng query/filter primitives.
- Không giữ `reportsCore` hoặc path `/api/reports/summary` cũ sau compatibility
  window.

**MCP**:

- Personal finance summary nhận cùng canonical range/filter.
- Không tự suy date range hoặc recalculate totals ngoài backend.

**Exit criteria**:

- Đóng `GAP-REP-02`, `GAP-UI-02` và phần report của `GAP-UI-03`.
- REST/MCP/report export trả cùng totals cho cùng filter fixture.

### Phase 8 — Engagement

**Mục tiêu**: notification, calendar và reminder dùng một upcoming-statement
projection.

**Backend**:

- Tạo query canonical cho unpaid/upcoming statement; notification, calendar,
  email và scheduler cùng tái sử dụng.
- Forgot-password tích hợp MailService hoặc provider-neutral delivery service;
  generic response vẫn giữ chống enumeration.
- Calendar/reminder giữ token hash, recipient authority, lease và retry policy.
- Thêm pagination/retention cho notification/delivery nếu dataset yêu cầu.

**Frontend**:

- Notification/filter/status dùng canonical projection.
- Bổ sung one-off calendar email action ở statement UI nếu còn trong scope.
- Profile subscription hiển thị one-time token warning và revoke state thống nhất.

**MCP**:

- Read upcoming statements dùng cùng query.
- Không expose send email, calendar token hoặc reminder mutation trừ khi có use
  case được duyệt và confirmation policy riêng.

**Exit criteria**:

- Đóng `GAP-AUTH-01`.
- Cùng statement fixture xuất hiện nhất quán ở payment UI, notification, feed,
  reminder và MCP.

### Phase 9 — Compatibility removal và contract automation

**Mục tiêu**: xóa nguồn thứ hai và tự động phát hiện drift.

**Công việc**:

- Xóa browser client/test cũ `/api/reports/summary`, legacy report core và smoke
  path không còn runtime.
- Xóa statement/card `monthlyData` khỏi authoritative path; migration/remove field
  chỉ sau backup và read telemetry.
- Quyết định giữ hoặc retire global `banks`/`cardtypes` sau khi catalog thay thế.
- OpenAPI phải inventory đủ runtime route; MCP docs chỉ liệt kê tool đang đăng ký.
- Thêm contract parity test: shared fixture -> service -> REST -> MCP.
- Thêm static rule/grep check ngăn route/tool import model trực tiếp trong slice
  đã migrate và ngăn frontend chứa authoritative formula.

**Exit criteria**:

- Đóng `GAP-API-01`, `GAP-DOC-01` và compatibility item đã đến removal date.
- Không có stale endpoint/tool trong docs, smoke test hoặc client source.

### Phase 10 — Release validation

**Mục tiêu**: chứng minh hệ thống thống nhất có thể rollout và rollback an toàn.

**Công việc**:

- Chạy shared/backend/frontend validation và targeted/full E2E.
- Chạy reconciliation read-only trước/sau migration trên non-production snapshot.
- Build hai image cùng immutable Git SHA và chạy image/security checks của CI.
- Staging smoke cho browser + REST + MCP cùng fixtures.
- Canary/feature flag cho compatibility removal nếu cần.
- Chuẩn bị rollback image, reverse/restore data và disable MCP mutation path.

Không deploy/apply, mutate shared/production data hoặc trigger pipeline nếu chưa
có yêu cầu và approval riêng.

**Exit criteria**:

- Không còn GAP mức Cao mở.
- Parity, workspace isolation, financial reconciliation và critical E2E pass.
- Rollback owner/command/data boundary được ghi rõ và thử ở non-production.

## 6. Ma trận capability và adapter mục tiêu

| Capability | Frontend | REST | MCP | Backend canonical service |
|---|---|---|---|---|
| Access & Tenancy | Auth/Profile/Admin | Auth/Profile/Workspace | Context validation | Auth/User/Workspace services |
| Card Portfolio | Cards/Catalog/Admin | Card/Catalog routes | `compare_cards` | Card/Catalog query-command services |
| Financial Ledger | Accounts/Transactions/Dashboard | Account/Transaction routes | account/transaction tools | Account/FinancialTransaction services |
| Credit Billing & Settlement | Cards/Payments/Statement detail | Statement/payment routes | statement/payment tools | Statement query/payment command services |
| Benefits & Fees | Cashback/Fee Center | Cashback/Fee routes | benefit read/mutation tools nếu duyệt | Benefit/Fee services |
| Financial Planning | Budget/Recurring | Finance planning routes | Chỉ tool được duyệt | Category/Budget/Recurring services |
| Reporting & Insights | Dashboard/Reports/export | Financial report/cash-flow routes | summary/read tools | Canonical report/query services |
| Engagement | Notifications/Profile | Notification/calendar routes | upcoming statements read | UpcomingStatement/Calendar/Reminder services |

## 7. Verification gates

### Gate cho mỗi slice

1. Shared contract build/test.
2. Domain unit tests.
3. Service tests với workspace/parent isolation.
4. REST adapter contract test.
5. MCP schema/parity test nếu capability expose MCP.
6. Frontend client/component test.
7. Critical browser E2E cho mutation.
8. Migration dry-run/reconciliation nếu đổi data.
9. SRS/OpenAPI/tool inventory updated.

### Gate tài chính bắt buộc

- Safe integer VND và ISO calendar date.
- No cross-workspace access.
- No double-count expense/payment/cashback/fee.
- Statement/payment transition fail-closed.
- Idempotent retry và concurrent request result ổn định.
- Preview và execute dùng exact canonical payload.
- Audit không chứa secret/PAN/token và có actor/channel/correlation.

## 8. Definition of Ready

Một slice chỉ bắt đầu implementation khi có:

- requirement IDs và GAP IDs liên quan;
- canonical source of truth;
- input/output/error draft;
- migration/compatibility decision;
- affected Frontend/REST/MCP consumers;
- security, concurrency và rollback assumptions;
- acceptance tests cụ thể.

## 9. Definition of Done

Một slice chỉ hoàn tất khi:

- không còn business rule trùng trong Frontend, REST route, MCP tool hoặc job;
- canonical service và contract được cả adapter liên quan sử dụng;
- UI hiển thị server-calculated values và refresh từ mutation result;
- MCP mutation có preview-confirm-idempotency-audit;
- workspace/parent/concurrency/financial tests pass;
- compatibility cũ đã xóa hoặc có owner/removal milestone;
- SRS, OpenAPI, MCP inventory và runbook đã đồng bộ;
- validation evidence và untested risks được ghi trong handoff.
- Scope: shared `CardDuplicateGroupDto` canonicalizes grouped cards; pure
  duplicate fingerprint/owner normalization dùng chung với merge guard;
  `CardQueryService.listDuplicates` scopes workspace, giữ inactive history và
  sort oldest-first; REST/frontend adapters chỉ map legacy card aliases.
- Acceptance evidence: shared validate pass (13 tests); backend full
  `npm run validate` pass (106 tests + build); frontend typecheck/lint/full
  tests pass (74 unit + 6 integration) và production build pass; duplicate
  service/REST/parser tests cover workspace, ordering, inactive card và
  normalized owner.
- Database impact: chỉ đọc `CreditCardModel` theo workspace; không schema/
  index/migration/data write, không cần Kubernetes backup.
- Residual risk: toàn workspace scan/in-memory grouping chưa pagination; merge
  và delete vẫn hai write/legacy path, chưa transaction/idempotency/cascade.
- Commit/push: `9c8f6e3` đã push thành công lên `origin/master`.
  legacy records trong slice này.
- Commit/push: feature code đã push tại 0dc20e7; thay đổi DB/index đã verify
  trên cluster, không chứa backup trong git. Docs checkpoint này sẽ được push
  trong commit kế tiếp.
