# Frontend / MCP / Backend — current execution plan

Đây là execution plan hiện hành và resumable handoff cho repository
`/home/longhn0710/workspace/card-credit`. Lịch sử implementation chi tiết nằm
trong Git commit history; file này chỉ giữ current state, evidence và việc còn
lại để tránh đọc nhầm checkpoint cũ.

## 1. Current state

- Branch `master` của application và chart đều đã push; worktree phải sạch
  trước khi bắt đầu slice mới.
- Progress bảo thủ: **20/20 unique GAP đã CLOSED = 100%**.
- Không claim 100% khi SRS còn `PARTIAL` hoặc runtime evidence chưa đủ.
- MCP live đang `MCP_WRITER_MODE=write` với `MCP_OLD_WRITER_FENCED=true`; không
  chạy mixed writers. GitOps hiện tại là chart `origin/master` revision
  `2bf577e`, image tag `a39ef952d6fa`; commit này chỉ đổi image từ
  `7a243ca86684` về `a39ef952d6fa`, writer fence vẫn giữ nguyên.

### SRS GAP ledger

| GAP | Status | Evidence hiện có | Còn thiếu |
|---|---|---|---|
| `GAP-CI-01` | `CLOSED` | Jenkins/source checkout, image/GitOps và read-only smoke evidence | Giữ regression gate |
| `GAP-SEC-01/02` | `CLOSED` | Trusted context, authoritative role/workspace, role-refresh regression, inactive/locked guard, sessionVersion bump, MCP provider bind/reject, stale-session tests; UAT runtime confirms configured user exists, active, unlocked, role `admin`, workspace match, valid sessionVersion, and authenticated MCP `list_accounts` returns `200` | Giữ authoritative lookup và runtime guard trong release gate |
| `GAP-MCP-01` | `CLOSED` | Canonical manifest, preview/confirm/idempotency tests, user-approved `DECISION-MCP-WRITE-01`, live `writerMode=write` with `MCP_OLD_WRITER_FENCED=true`, health/ready/docs `200`, unauthenticated `/mcp` `401`, 17-tool inventory; full-cluster inventory has only canonical backend/frontend workloads, ingress retained 24h has card-host `/mcp=0` and `5xx=0`; authenticated UAT account preview/confirm/replay `200` with one completed receipt and one audit | Giữ writer fence, no-mixed-writer inventory và receipt/audit monitoring trong release gate |
| `GAP-PAY-01/02`, `GAP-STM-01` | `CLOSED` | Shared payment contract, state machine, preview, CAS, idempotency, command tests và `DECISION-PAY-REV-01`; fresh UAT backup before payment; canonical preview/confirm/replay all `200`, one `PAID` statement, one `STATEMENT_PAYMENT`, one completed receipt and one audit; post-check `8/8` payment sync, `missingPayments=[]`, orphan records `0`, index duplicates `0` | Giữ preview/CAS/idempotency/audit, PAID lock và no-reversal guard trong release gate |
| `GAP-OPS-01` | `CLOSED` | Startup không silent-write; operator guard/test | Giữ dry-run/apply guard |
| `GAP-DATA-01`, `GAP-ACC-01`, `GAP-DATA-02` | `CLOSED` | Source/tests và live read-only index/duplicate/orphan audit | Giữ preflight |
| `GAP-REP-01/02` | `CLOSED` | Ledger/category source decision, shared contracts, report guard và live read-only reconciliation | Giữ no-join/orphan checks |
| `GAP-UI-02/03` | `CLOSED` | Canonical filters/lifecycle và Playwright planning/report acceptance | Giữ browser acceptance |
| `GAP-AUTH-01` | `CLOSED` | Generic forgot-password, MailService tests, SMTP `transport.verify()` và regression; UAT delivery tới configured MCP user trả HTTP `200`, generic response không có reset link, `PASSWORD_RESET_REQUESTED` audit có `delivered=true` | Giữ generic response, no-token logging và SMTP failure audit |
| `GAP-API-01`, `GAP-WEB-01`, `GAP-DOC-01`, `GAP-PERF-01` | `CLOSED` | Inventory, docs, bounded reads, live query profile | Giữ release gates |

## 2. Latest evidence

### Local validation

- Shared: `npm run validate` — build pass, tests `29/29`.
- Backend: `npm run validate` — typecheck/lint/build pass, tests `162/162`.
- Backend exhaustive local suite: `npm run test:all` — tests `259/259` pass,
  including non-blocking legacy/reconciliation/payment coverage.
- Frontend: curated `npm test` `44/44`, integration `6/6`, typecheck/lint/build
  pass, production build renders `24` routes.
- Current frontend SRS gate: `npm ci --include=optional` and
  `npm run test:unit --if-present` pass with `80/80`; frontend source is
  unchanged by the current backend/security slices.
- Current validation rerun: shared `npm run validate` pass (`29/29`); backend
  `npm run validate` pass (typecheck/lint/build, critical `162/162`); frontend
  `npm ci --include=optional`, unit `80/80`, integration `6/6`, typecheck, lint
  and build pass (24 routes).
- Runtime policy-membership evidence: configured MCP user is present and
  authoritative `users` lookup reports active/unlocked `admin`, matching fixed
  workspace and valid sessionVersion; authenticated MCP initialize and
  `list_accounts` both returned `200`.
- SMTP UAT delivery evidence: configured SMTP fields are present; forgot-password
  delivery to the configured MCP user returned `200` with generic response and
  no reset link, while the latest `PASSWORD_RESET_REQUESTED` audit recorded
  `delivered=true`.
- MCP config regression also confirms `MCP_OLD_WRITER_FENCED=true` alone keeps
  the default mode `read`; write requires an explicit writer mode plus the
  fence acknowledgement.
- Workspace repository inventory at source `f7855f0` found no additional MCP
  writer workload/configuration outside the application and chart repositories.
  A separate local OpenClaw log records an external `card-credit` probe with
  `14` tools at `2026-08-12T08:32:49Z`, `08:52:09Z` and `09:12:44Z`, then
  `10` tools at `09:33:59Z` and `15:54:49Z`; the log does not expose endpoint,
  auth, mode or traffic outcome. This is external-client evidence to retain,
  not proof that old-writer traffic has drained.
- Local Docker/buildkit artifact checks are not authoritative for the deployed
  image; Jenkins remains the image build/publish evidence. No local server or
  local database side effect was run; UAT DB changes are recorded separately
  below.
- GitOps chart release gate was green at writer capability commit `45b578a`;
  current remote chart `origin/master` is `2bf577e` and Argo is using immutable
  image tag `a39ef952d6fa`, with
  `MCP_WRITER_MODE=write` and `MCP_OLD_WRITER_FENCED=true` after
  `DECISION-MCP-WRITE-01`. The local chart checkout remains stale and is not
  the Argo source of truth; the remote image drift was observed, not initiated
  by this checkpoint.
- Argo read-only status is `Synced/Healthy` at revision
  `2bf577e7ab554ae2e3971dec9d049ef7f16c3d79`; both deployments report one
  available replica. Current backend digest is
  `sha256:abdd03d98a1238d3eb2bef1e1057403ea1bb26a3a6747ff153fda8dc99c3c0eb`
  and frontend digest is
  `sha256:f38e9463598cb8cbe62aa442fad1a71fdf90cab9c66b7811588b3fa9e24a493d`.
  This supplies deployed writer-capability evidence; authenticated receipt,
  reconciliation and policy-membership evidence are recorded in the UAT
  checkpoints below.
- Stale-reference audit ngoài historical ledger không còn
  `/api/reports/summary`, `reportsCore`, `docs/refactor*`, legacy category
  defaults hoặc các document đã xóa.

### Live read-only profile

- Kubernetes context/namespace đã xác minh: `k8s-admin-public` / `card-credit`.
- Backend/frontend `1/1 Ready`, backend restart `0`; live MCP config là
  `MCP_WRITER_MODE=write`, `MCP_OLD_WRITER_FENCED=true`.
- Current pod direct read-only probe through a temporary port-forward returned
  `/health=200`, `/ready=200`, `/docs/json=200`, and unauthenticated `/mcp=401`.
  OpenAPI hiện báo `writerMode=write`, mutation inventory preview/confirm và
  `auditStatus=PENDING`; sau đó UAT smoke account preview/confirm/replay đều
  `200` và ghi nhận một completed receipt + một audit.
- Current backend pod started at `2026-08-17T17:11:39Z`, has restart `0`. A
  bounded `168h` pod-log query returned `556` lines, `2` GET `/mcp` entries
  (one external-host request and one local port-forward probe), no mutation or
  receipt/audit/writer terms, and no HTTP `5xx`. This is a bounded absence
  observation, not evidence that external old writers are fenced or drained.
- Không in secret, token, raw payload, raw financial ID/amount.
- Read-only topology audit thấy đúng một backend pod và một frontend pod,
  mỗi pod `Ready=true`, restart `0`; Ingress chỉ route `/mcp` và `/docs` vào
  backend service hiện tại. Đây là evidence không thấy old writer trong
  cluster inventory, không phải external traffic drain evidence.
- Full-cluster workload inventory found only the canonical backend/frontend
  deployments carrying MCP configuration. The only other matching name was a
  Jenkins Trivy build pod, not an application writer; no other workload had
  `MCP_*` writer environment names or a card-credit application image.
- Ingress controller access-log count trong retained UAT 24h window: `5,980`
  total lines, `134` requests cho host card-credit, `0` `/mcp`, `16` card-host
  `401` và `0` card-host `5xx`. Đây là UAT fence/drain evidence trong window;
  không phải production seven-day telemetry claim.
- Extended read-only query `--since=168h` trên controller hiện tại chỉ còn `10`
  dòng retained, `0` card-credit host và `0` `/mcp`; retention quá ngắn để
  nâng thành evidence seven-day drain ngoài UAT window.

### UAT database checkpoint

- Exact target đã xác minh: Kubernetes context `k8s-admin-public`, namespace
  `card-credit`, current Ready backend pod; không patch/restart/scale workload.
- Backup chạy trước mọi DB write: 4 workspace-scoped JSON files, `218451` bytes,
  content hash `1788fbaeac2e8d78244fe560f7acbc84bba98ef751e91115773e49358edb18a`,
  lưu ngoài repository tại `/home/longhn0710/workspace/card-credit-backups/`
  với permission `700`.
- Reconciliation dry-run đọc 4 workspace: workspace có dữ liệu chính có
  `5` cards, `11` statements, `7` paid statements, `45` financial transactions,
  `7/7` paid-statement payment sync và `missingPayments=0`; không có candidate
  hoặc quarantine case, nên không ghi case và không mark-paid.
- `ensure-command-guard-indexes` và `ensure-data-integrity-indexes` đã chạy với
  apply guard sau preflight duplicate `0`; required indexes được verify. Đây
  là additive/idempotent migration, không thay đổi financial rows.
- Authenticated MCP UAT smoke đã chạy đúng một lần với account `CASH` opening
  balance `0`: preview/confirm/replay đều `200`, replay trả cùng result hash;
  DB evidence là `accountCount=1`, `receiptCount=1`, `auditCount=1`, receipt
  `COMPLETED`. Đây là test persistence cho canonical writer/idempotency, không
  phải statement payment và không tạo reversal/compensating transaction.
- Trước canonical payment smoke, fresh UAT backup có 4 workspace-scoped files,
  `221038` bytes và content hash
  `a51ffcafdf7867d2b269dbe477f2b5491755f4bc81bc29955a13f76f4b53da7d`.
- Canonical payment smoke trên một unpaid UAT statement dùng preview-bound
  payload/CAS/hash và idempotency: preview/confirm/replay đều `200`, replay
  cùng result hash, statement `PAID`, đúng một `STATEMENT_PAYMENT`, một
  `COMPLETED` receipt và một audit. Post-reconciliation ghi nhận `8/8` paid
  statement sync, `missingPayments=[]`, orphan records `0`, duplicate guards `0`.

## 3. Next execution order

### Slice A — safe cleanup and contract evidence

1. Audit `consumer -> source` bằng `rg`/inventory.
2. Xóa chỉ dead code/document có zero consumer.
3. Giữ compatibility path còn consumer: legacy receipt reads của
   `McpMutationModel`, card `monthlyData` và reconciliation planner.
4. Mỗi xóa phải có regression/stale-reference evidence, cập nhật ledger, review,
   commit và push.

Checkpoint hiện tại đã hoàn tất source inventory và regression guard cho old
writer: application source không có `McpMutationModel` create/update/upsert/
delete; chỉ còn 3 `findOne` compatibility reads, và test `legacy-writer-
fence.test.ts` sẽ chặn việc tái tạo write path. UAT ingress fence/drain window
và full-cluster inventory được ghi nhận ở phần MCP checkpoint.

Security checkpoint: `createMcpContextProvider` giữ context authoritative giữa
các invocation; lần đầu bind `sessionVersion`, lần sau fail-closed khi version
đã bị bump. Test `context.test.ts` chứng minh revoke path; live image
`a39ef952d6fa` là deployed source checkpoint và đang Ready. UAT runtime đã
chứng minh configured user active/unlocked, role/workspace match và
sessionVersion hợp lệ.

Decision mới được chốt: local `users` store là policy authority vì hiện không
có external IdP; `workspaceId`, `role`, `active`, `lockedAt` và `sessionVersion`
được revalidate server-side. Canonical MCP writer được user cho phép cho mọi
workspace đã cấu hình, nhưng vẫn bind từng `MCP_USER_ID` + `MCP_WORKSPACE_ID`;
không cho payload chọn tenant, không mixed writers và không mở reversal/
compensating transaction.

### Slice B — security evidence (completed)

1. Browser/MCP trusted context giữ fail-closed.
2. UAT read-only policy lookup + authenticated MCP query đã xác nhận
   authoritative membership.
3. `GAP-SEC-01/02` đã chuyển `CLOSED` trong SRS ledger.

### Slice C — MCP fence

1. **Đã hoàn tất capability rollout** bằng chart commit `45b578a` và current
   GitOps revision `2bf577e`: `writerMode: write`, `oldWriterFenced: true`,
   immutable image `a39ef952d6fa`; không patch Kubernetes trực tiếp.
2. Read-only verification sau rollout: Argo `Synced/Healthy`, pod Ready/restart
   `0`, health/readiness/docs `200`, unauthenticated `/mcp` `401`, OpenAPI
   writer inventory có preview/confirm và `auditStatus=PENDING`.
3. UAT reconciliation/index checkpoint, canonical writer smoke và ingress
   fence/drain window đã hoàn tất; không chạy mixed writers. Legacy receipt
   reads vẫn giữ vì còn compatibility consumer ngoài UAT.

### Slice D — financial boundary

1. Giữ payment preview/CAS/idempotency/audit contracts và regression tests.
2. Áp dụng `DECISION-PAY-REV-01`: `PAID` lock và mọi reversal/compensating
   transaction fail-closed; normal payment chỉ chạy qua explicit
   preview/confirm/CAS/idempotency/audit.
3. UAT additive index migration và canonical payment smoke đã được ủy quyền,
   backup trước và verify sau; không dùng legacy mark-paid script, không
   reversal/compensating transaction, không xóa legacy receipt.

### Slice E — final gate (completed)

1. Validation theo SRS mục 9 đã pass.
2. Independent review source diff, stale references, SRS ledger và runtime
   evidence đã pass.
3. Evidence docs được commit/push; SRS không còn GAP `PARTIAL`.

## 4. Validation commands

```bash
cd shared && npm run validate
cd ../backend && npm run validate
cd ../frontend
npm ci --include=optional
npm test
npm run typecheck
npm run lint
npm run test:integration
npm run build
```

CI dùng một curated entrypoint `npm test`; các package vẫn giữ `test:all` cho
exhaustive local verification khi cần.

Current external CI library checkpoint `ci-platform@9aba1d4` removes the
separate `test:unit`, `test:integration`, `coverage` and `test:coverage` calls;
the npm validation loop invokes only `npm test` per package. The repository
`Jenkinsfile` delegates to that library and keeps `shared → frontend → backend`
ordering.

## 5. Cleanup ledger

Đã xóa sau zero-consumer audit:

- `docs/product.md`
- `docs/ui-design.md`
- stale `docs/database.md` rollout ledger (old pod/backup path; retained the
  current dry-run, backup and rollback policy)
- `frontend/lib/api/statementCalendarEmailCore.d.ts` (declaration không có
  consumer TypeScript; runtime source là `.mjs` và vẫn có regression test)
- Frontend API helpers không có production caller: `getCreditStatements`,
  `getCreditStatementsPage`, `fetchCardStatements`, `fetchCardStatementsPage`,
  `fetchStatementDetail`, `fetchCard` và `updateCardOperational`; các import,
  schema import và contract assertion chỉ phục vụ các helper này cũng đã được
  dọn. Compatibility REST projection
  `/api/financial-reports/credit-statements` và các schema/page projection chỉ
  phục vụ nó cũng đã được xóa sau khi xác nhận không có first-party caller và
  ingress 168 giờ không có request.
- Card-scoped fee-payment REST adapter (`GET/POST/PUT/DELETE
  /api/cards/:cardId/fee-payments`) và các command wrapper riêng đã được xóa
  sau zero-first-party-consumer audit. Fee Center REST và MCP
  `list_card_fee_payments` vẫn dùng chung model/query logic cần thiết cho
  report. Read-only ingress check on `k8s-admin-public` found `0`
  `fee-payments` request log matches in the available 168-hour window; this
  is the rollout evidence for the breaking 404 compatibility removal.
- Financial-report compatibility projection
  `GET /api/financial-reports/credit-statements` cùng
  `creditStatementReport*`, `statementPageSchema` và mapper/service tests đã
  được xóa. Summary `creditDebtLedger` là contract canonical duy nhất cho
  report debt; ingress 168 giờ có 0 request tới endpoint cũ.
- Các declaration còn lại trong `frontend/types/` và `frontend/lib/api/*.d.ts`/
  `*.d.mts` đã được đối chiếu với export/consumer; chúng là ambient module hoặc
  type contract đang được TypeScript/JS sử dụng, nên không có file nào an toàn
  để xóa thêm trong cleanup slice này.
- legacy finance-category defaults endpoint/service
- các alias/wrapper/catalog/cache/index repair path đã được ghi trong Git
  history và không còn consumer.

Đang giữ vì còn consumer hoặc cần decision:

- `McpMutationModel` và `legacyPayloadHash`/receipt compatibility: source hiện
  chỉ đọc legacy receipt; không còn đường create/update trong application source.
  Removal gate là external writer fence/drain + legacy receipt reconciliation;
  xóa read path trước các bước đó có thể khiến retry cũ tạo giao dịch tài chính
  trùng.
- card `monthlyData` và restricted duplicate-merge history path
- legacy payment reconciliation planner/operator command
- `docs/ui-architecture-review.md`, `docs/requirements.md`, `docs/SRS.md`,
  `docs/finance-source-of-truth.md` vì còn reference hoặc là canonical
  operational/product requirements.
- `docs/openclaw/skills/personal-finance-ledger/SKILL.md` vì local OpenClaw
  evidence cho thấy đây là operational contract của external MCP consumer,
  dù không có import trong application repository.
- `docs/mcp-preview-rollout.md` vì là operational gate bắt buộc cho future
  writer rollout; đã được index trong `docs/README.md`, không phải historical
  document.

Current API audit clarification:

- `/api/notes` không bị coi là dead chỉ vì chưa thấy frontend caller: `FR-08`
  vẫn yêu cầu upsert/delete note và `docs/api.md`/SRS đang công bố contract.
  Đây là GAP về UI consumer cần xử lý riêng, không phải lý do xóa API.
- `/api/workspace/owner`, `POST /api/accounts` và
  `POST /api/financial-transactions` vẫn giữ vì còn REST manifest/docs,
  admin/scheduler dependency hoặc canonical REST/MCP command contract. Chỉ
  xóa sau external-consumer/compatibility audit riêng.

API consumer inventory (current source audit):

| Surface | Current consumer/evidence | Decision |
|---|---|---|
| Auth, profile, admin users/audit/catalog | Login/register/profile/admin pages, bootstrap job contract, REST tests | KEEP |
| Card list/create/delete/duplicate | Cards UI, AddCardModal, DuplicateResolver, smoke/e2e | KEEP |
| Card detail/update and card-scoped statement reads | Card detail UI, REST manifest, backend contract tests, smoke/compatibility DTO | KEEP-CANONICAL |
| Statement payment preview/execute | Cards and Payments pages, MCP payment tools, REST/MCP parity tests | KEEP |
| Calendar email and notes | SRS `FR-07`/`FR-08`, backend services/tests/docs; current UI caller is missing | KEEP-SRS; track UI coverage separately |
| Accounts and financial transactions | Accounts list in UI; REST command tests and MCP canonical command adapters | KEEP-CANONICAL |
| Summary report / `creditDebtLedger` | Summary UI, MCP and REST summary use one canonical debt projection | KEEP-CANONICAL |
| `/api/financial-reports/credit-statements` | No first-party caller; ingress 168-hour window has 0 requests; superseded by `creditDebtLedger` | REMOVED |
| Planning, recurring, fee-center, cashback, cash-flow, notifications | Corresponding frontend pages/clients and backend/MCP tests | KEEP |
| Card-scoped fee-payment routes | No first-party caller; UI uses Fee Center and MCP keeps shared read tool; ingress window has 0 matches | REMOVED |
| Workspace owner | Admin REST tests, workspace service, reminder scheduler fallback | KEEP-SERVICE; API requires external/admin audit |
| Masterdata and calendar subscriptions | Masterdata pages and calendar settings component | KEEP |

The route list remains authoritative in `backend/src/rest-manifest.ts` (74
entries after this removal), runtime parity is enforced by `rest-runtime-inventory.test.ts`, and
the MCP list remains authoritative in `backend/src/mcp/manifest.ts` (17 tools).

## 6. Safety and definition of done

- Không restart, scale, patch, sync hoặc apply Kubernetes.
- UAT DB migration và canonical preview/confirm smoke chỉ được chạy sau
  backup; không đọc/in secret value. SMTP UAT delivery được phép nhưng không
  in recipient/token.
- Không reversal/compensating transaction.
- `CLOSED` chỉ có nghĩa là đủ evidence trong SRS ledger; absence trong log,
  desired state hoặc unit test không thay thế evidence production cần thiết.
- Completion chỉ được claim khi SRS không còn `PARTIAL`, validation xanh, stale
  audit sạch, cleanup có zero-consumer proof và runtime evidence đúng scope.

## 7. Session handoff prompt

```text
Bạn đang tiếp tục refactor repository /home/longhn0710/workspace/card-credit.
Đọc AGENTS.md, docs/SRS.md, docs/frontend-mcp-backend-unification-plan.md và
git status/log trước khi sửa. Không lặp commit đã push và không claim GAP nếu
thiếu source/test/runtime evidence.

Tiếp tục từ GAP còn thiếu hiện hành trong execution plan. Ưu tiên vertical slice
source -> contract -> service -> adapter -> test -> docs. Chạy validation theo
SRS mục 9; CI chỉ dùng curated npm test. Nếu sửa lỗi, thêm regression test,
independent review, cập nhật SRS/plan, commit và push.

MCP mặc định read, không mixed writers. Không restart/scale/patch/sync/apply
Kubernetes; production không mutate. UAT DB/index migration và canonical
preview/confirm smoke phải có backup trước; không chạy legacy mark-paid khi
thiếu case/plan/hash, không reversal hoặc compensating transaction.
Giữ các compatibility path còn consumer và chỉ xóa dead code/document sau
zero-consumer audit. Mục tiêu là SRS 100%, nhưng chỉ đánh dấu hoàn tất khi mọi
GAP có evidence đúng scope.
```
