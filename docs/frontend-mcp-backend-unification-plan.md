# Frontend / MCP / Backend — current execution plan

Đây là execution plan hiện hành và resumable handoff cho repository
`/home/longhn0710/workspace/card-credit`. Lịch sử implementation chi tiết nằm
trong Git commit history; file này chỉ giữ current state, evidence và việc còn
lại để tránh đọc nhầm checkpoint cũ.

## 1. Current state

- Branch `master` của application và chart đều đã push; worktree phải sạch
  trước khi bắt đầu slice mới.
- Progress bảo thủ: **13/20 unique GAP đã CLOSED = 65%**.
- Không claim 100% khi SRS còn `PARTIAL` hoặc runtime evidence chưa đủ.
- MCP live giữ `MCP_WRITER_MODE=read`; không chạy mixed writers.

### SRS GAP ledger

| GAP | Status | Evidence hiện có | Còn thiếu |
|---|---|---|---|
| `GAP-CI-01` | `CLOSED` | Jenkins/source checkout, image/GitOps và read-only smoke evidence | Giữ regression gate |
| `GAP-SEC-01/02` | `PARTIAL` | Trusted context, authoritative role/workspace, role-refresh regression, inactive/locked guard, sessionVersion bump, MCP provider bind/reject, stale-session tests và deployed image `e003fb24c94f` | Runtime authoritative policy-membership evidence |
| `GAP-MCP-01` | `PARTIAL` | Canonical manifest, preview/confirm/idempotency tests, config regression proving fence flag alone does not enable writer, chart/live read mode, historical authenticated `tools/list` 11/11 query tools, current unauthenticated `/mcp` 401 và external OpenClaw probe evidence | External old-writer fence/drain và financial receipt/audit/reconciliation traffic evidence |
| `GAP-PAY-01/02`, `GAP-STM-01` | `PARTIAL` | Shared payment contract, state machine, preview, CAS, idempotency, command tests và `DECISION-PAY-REV-01` fail-closed boundary | Persistence/reconciliation evidence |
| `GAP-OPS-01` | `CLOSED` | Startup không silent-write; operator guard/test | Giữ dry-run/apply guard |
| `GAP-DATA-01`, `GAP-ACC-01`, `GAP-DATA-02` | `CLOSED` | Source/tests và live read-only index/duplicate/orphan audit | Giữ preflight |
| `GAP-REP-01/02` | `CLOSED` | Ledger/category source decision, shared contracts, report guard và live read-only reconciliation | Giữ no-join/orphan checks |
| `GAP-UI-02/03` | `CLOSED` | Canonical filters/lifecycle và Playwright planning/report acceptance | Giữ browser acceptance |
| `GAP-AUTH-01` | `PARTIAL` | Generic forgot-password, MailService tests, SMTP `transport.verify()` và regression chứng minh SMTP failure không làm lộ reset link, audit `delivered=false` | Approved-recipient delivery/sender-owner evidence |
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
- Latest full gate for the previous source checkpoint (`d488379`): frontend
  `npm ci --include=optional`, `npm run test:unit --if-present` `80/80`,
  typecheck/lint/integration `6/6`/build pass; shared `29/29`; backend
  `160/160` with typecheck/lint/build pass, including the read-only legacy
  writer fence and MCP session-version revoke regressions.
- Current source slice adds the forgot-password SMTP-failure fence; backend
  critical `161/161`, exhaustive `258/258`, typecheck/lint/build all pass.
- Current security coverage slice adds authoritative MCP role-refresh
  regression; backend critical `162/162`, exhaustive `259/259`,
  typecheck/lint/build all pass.
- MCP config regression also confirms `MCP_OLD_WRITER_FENCED=true` alone keeps
  the default mode `read`; write requires an explicit writer mode plus the
  fence acknowledgement.
- Cleanup checkpoint at source `88a6cc2`: consumer audit found no TypeScript
  consumer for `frontend/lib/api/statementCalendarEmailCore.d.ts`; the
  declaration was removed while the runtime `.mjs`, client behavior and
  `statementCalendarEmail.test.mjs` remain intact. The retained
  `calendarSubscriptionsCore.d.ts` still has a TypeScript client consumer.
- Post-cleanup validation: frontend `npm ci --include=optional`, lint,
  typecheck, curated `npm test` `44/44`, `test:unit` `80/80`, integration
  `6/6`, and production build all pass; shared `29/29` and backend `162/162`
  with typecheck/lint/build also pass. CI entrypoint regression and chart
  read-only lint/template remain green.
- Workspace repository inventory at source `f7855f0` found no additional MCP
  writer workload/configuration outside the application and chart repositories.
  A separate local OpenClaw log records an external `card-credit` probe with
  `14` tools at `2026-08-12T08:32:49Z`, `08:52:09Z` and `09:12:44Z`, then
  `10` tools at `09:33:59Z` and `15:54:49Z`; the log does not expose endpoint,
  auth, mode or traffic outcome. This is external-client evidence to retain,
  not proof that old-writer traffic has drained.
- Local container artifact build was attempted read-only: Docker CLI exists but
  the daemon is unavailable (`permission denied` on `/var/run/docker.sock`) and
  no `buildctl` is installed. No permission bypass was used; Jenkins remains
  the authoritative image build/publish evidence.
- Buildah then produced local source-HEAD artifacts without registry push:
  backend `localhost/card-credit-backend:3d194ea` (`4777524dca97`, non-root
  user `backend`, CMD `npm run start`) and frontend
  `localhost/card-credit-frontend:3d194ea` (`28ed18144b6d`, non-root user
  `nextjs`, CMD `node server.js`). Frontend optional card-image fetch failures
  used the repository placeholder fallback; Next build still generated all
  `24` routes successfully.
- A Docker-format backend build also passed as
  `localhost/card-credit-backend:3d194ea-docker` (`607374fba31e`), retaining
  `user=backend`, `CMD npm run start` and the declared `/health` HEALTHCHECK.
- Current backend source packaging was rebuilt locally from the code at
  `9f608e0`: OCI artifact `localhost/card-credit-backend:9f608e0`
  (`b0c3180d9599`) and Docker-format artifact
  `localhost/card-credit-backend:9f608e0-docker` (`a1fd6f5d5636`) both passed.
  They retain non-root `user=backend`, `CMD npm run start` and the Docker
  `/health` HEALTHCHECK. A compiled-config smoke returned `read`,
  `oldWriterFenced=true`, `0.0.0.0:3001`; no server or persistence was run.
- Local container smoke from those artifacts passed: frontend `/` returned
  HTTP `200` with HTML content; backend compiled config loaded with
  `writerMode=read`, `oldWriterFenced=false`, `0.0.0.0:3001`. Backend server
  was not started because no local MongoDB is available; no persistence side
  effect was attempted.
- Chart release gate is green in `/home/longhn0710/workspace/k8s-namepsace-chart/card-credit`:
  `helm lint .` pass and `helm template` pass with hypothetical immutable tag
  `a989ae7`;
  rendered backend keeps `MCP_WRITER_MODE=read` and
  `MCP_OLD_WRITER_FENCED=true`. This is desired-state evidence only; it is not
  proof that the live pod has that image.
- Current read-only divergence: local chart `values.yaml` still declares
  `5267c79cf437`, while live backend/frontend pods run immutable image tag
  `e003fb24c94f`; source `f7855f0` is a docs/cleanup descendant of the
  deployed application code. No chart value or cluster resource was changed
  by this task.
- Argo read-only status is `Synced/Healthy` at revision
  `38a88b502226303f7503657d373aeebe024c4fe1`; both deployments report one
  available replica. The backend image digest is
  `sha256:0f83839da96a7da659226fdd7cb5f1a53324b32c703569610210abfc42e8f0f5`.
  This supplies deployed-image evidence for the source guards, but not
  authoritative policy-membership or external-writer evidence.
- Stale-reference audit ngoài historical ledger không còn
  `/api/reports/summary`, `reportsCore`, `docs/refactor*`, legacy category
  defaults hoặc các document đã xóa.

### Live read-only profile

- Kubernetes context/namespace đã xác minh: `k8s-admin-public` / `card-credit`.
- Backend/frontend `1/1 Ready`, backend restart `0`; live MCP config là
  `MCP_WRITER_MODE=read`, `MCP_OLD_WRITER_FENCED=true`.
- Current pod direct read-only probe through a temporary port-forward returned
  `/health=200`, `/ready=200`, `/docs/json=200`, and unauthenticated `/mcp=401`.
  The earlier authenticated profile (`11/11` query tools) remains historical
  evidence and was not re-used as a fresh authenticated current-pod claim.
- Current backend pod started at `2026-08-17T16:14:17Z`, has restart `0`, and
  emitted `0` log lines in the `30m` observation window. A quiet log window is
  not evidence that external clients are fenced.
- Không in secret, token, raw payload, raw financial ID/amount.
- Read-only topology audit thấy đúng một backend pod và một frontend pod,
  mỗi pod `Ready=true`, restart `0`; Ingress chỉ route `/mcp` và `/docs` vào
  backend service hiện tại. Đây là evidence không thấy old writer trong
  cluster inventory, không phải external traffic drain evidence.
- Ingress controller access-log count trong 24h: `3,962` total lines,
  `134` requests cho host card-credit, `0` `/mcp`, `16` card-host `401` và
  `0` card-host `5xx`. Đây là read-only observation trong một log window;
  không đủ để khẳng định client cũ đã bị fence/drain ngoài window.
- Extended read-only query `--since=168h` trên controller hiện tại chỉ còn `10`
  dòng retained, `0` card-credit host và `0` `/mcp`; retention quá ngắn để
  nâng thành evidence seven-day drain, nên GAP vẫn `PARTIAL`.
- Latest read-only backend log check returned `0` lines in the current `30m`
  window; this confirms only that no application logs were emitted in that
  window, not that external old writers are drained.

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
fence.test.ts` sẽ chặn việc tái tạo write path. Đây là evidence để không xóa
nhầm, chưa phải evidence external writer đã drain.

Security checkpoint: `createMcpContextProvider` giữ context authoritative giữa
các invocation; lần đầu bind `sessionVersion`, lần sau fail-closed khi version
đã bị bump. Test `context.test.ts` chứng minh revoke path; live image
`e003fb24c94f` là descendant/ancestor-aligned với source guard và đang Ready.
Runtime authoritative policy-membership evidence vẫn còn thiếu.

### Slice B — security evidence

1. Giữ browser/MCP trusted context fail-closed.
2. Bổ sung read-only runtime evidence cho authoritative policy membership nếu
   có thể thu được mà không đọc secret hoặc mutate production; deployed-image
   evidence cho session/role/workspace guard đã được ghi nhận.
3. Chỉ chuyển `GAP-SEC-01/02` sang `CLOSED` khi evidence đúng scope.

### Slice C — MCP fence

1. Giữ chart/live writer mode `read`.
2. Kiểm tra read-only deployment/service/pod inventory và bounded logs.
3. Không suy diễn external fence từ `MCP_OLD_WRITER_FENCED=true` hoặc absence
   của pod nội bộ.
4. Không gọi preview/confirm và không bật writer trong task này.

### Slice D — financial boundary

1. Giữ payment preview/CAS/idempotency/audit contracts và regression tests.
2. Áp dụng `DECISION-PAY-REV-01`: `PAID` lock và mọi reversal/compensating
   transaction fail-closed; không tự tạo financial side effect.
3. Không sửa DB/migration/index production và không xóa legacy receipt trước
   decision/migration evidence.

### Slice E — final gate

1. Chạy validation theo SRS mục 9.
2. Independent review source diff, stale references, SRS ledger và runtime
   evidence.
3. Commit/push từng slice; chỉ claim 100% khi không còn `PARTIAL` và mọi GAP có
   source + test + runtime evidence phù hợp.

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
- `frontend/lib/api/statementCalendarEmailCore.d.ts` (declaration không có
  consumer TypeScript; runtime source là `.mjs` và vẫn có regression test)
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

## 6. Safety and definition of done

- Không restart, scale, patch, sync hoặc apply Kubernetes.
- Không gửi email thật, không đọc secret value, không mutate database.
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

Tiếp tục từ GAP PARTIAL hiện hành trong execution plan. Ưu tiên vertical slice
source -> contract -> service -> adapter -> test -> docs. Chạy validation theo
SRS mục 9; CI chỉ dùng curated npm test. Nếu sửa lỗi, thêm regression test,
independent review, cập nhật SRS/plan, commit và push.

MCP mặc định read, không mixed writers. Không restart/scale/patch/sync/apply
Kubernetes; không sửa DB/migration/index production; không chạy payment
persistence, reconciliation apply, reversal hoặc compensating transaction.
Giữ các compatibility path còn consumer và chỉ xóa dead code/document sau
zero-consumer audit. Mục tiêu là SRS 100%, nhưng chỉ đánh dấu hoàn tất khi mọi
GAP có evidence đúng scope.
```
