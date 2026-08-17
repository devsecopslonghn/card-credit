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
- MCP live đang `MCP_WRITER_MODE=write` với `MCP_OLD_WRITER_FENCED=true`; không
  chạy mixed writers.

### SRS GAP ledger

| GAP | Status | Evidence hiện có | Còn thiếu |
|---|---|---|---|
| `GAP-CI-01` | `CLOSED` | Jenkins/source checkout, image/GitOps và read-only smoke evidence | Giữ regression gate |
| `GAP-SEC-01/02` | `PARTIAL` | Trusted context, authoritative role/workspace, role-refresh regression, inactive/locked guard, sessionVersion bump, MCP provider bind/reject, stale-session tests và deployed image `7a243ca86684` | Runtime authoritative policy-membership evidence |
| `GAP-MCP-01` | `PARTIAL` | Canonical manifest, preview/confirm/idempotency tests, user-approved `DECISION-MCP-WRITE-01`, chart/live `writerMode=write` with `MCP_OLD_WRITER_FENCED=true`, current unauthenticated `/mcp` 401 and OpenAPI mutation inventory; no mutation tool was called | External old-writer fence/drain và financial receipt/audit/reconciliation traffic evidence |
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
  image; Jenkins remains the image build/publish evidence. No local server,
  database or persistence side effect was run during this audit.
- GitOps chart release gate is green from remote chart `origin/master`
  `45b578a`: `helm lint` and `helm template` pass; rendered backend/frontend
  use immutable image tag `7a243ca86684`, with
  `MCP_WRITER_MODE=write` and `MCP_OLD_WRITER_FENCED=true` after
  `DECISION-MCP-WRITE-01`. The local chart checkout remains stale and is not
  the Argo source of truth.
- Argo read-only status is `Synced/Healthy` at revision
  `45b578a2ed03c28fd98992894a9669fe766d9362`; both deployments report one
  available replica. Backend digest is
  `sha256:42707b8aef2ed20925e2f12e630ac7ad02d0d30faca61ea7a8c34a3850004f83`
  and frontend digest is
  `sha256:81ffe269147b03387d9c8ad9311cef2764603702428538dbef03151079373cff`.
  This supplies deployed writer-capability evidence, but not financial
  receipt/reconciliation evidence or authenticated policy-membership proof.
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
  `auditStatus=PENDING`; không gọi mutation tool.
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
- Ingress controller access-log count trong 24h: `3,962` total lines,
  `134` requests cho host card-credit, `0` `/mcp`, `16` card-host `401` và
  `0` card-host `5xx`. Đây là read-only observation trong một log window;
  không đủ để khẳng định client cũ đã bị fence/drain ngoài window.
- Extended read-only query `--since=168h` trên controller hiện tại chỉ còn `10`
  dòng retained, `0` card-credit host và `0` `/mcp`; retention quá ngắn để
  nâng thành evidence seven-day drain, nên GAP vẫn `PARTIAL`.

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
`7a243ca86684` là deployed source checkpoint và đang Ready.
Runtime authoritative policy-membership evidence vẫn còn thiếu.

Decision mới được chốt: local `users` store là policy authority vì hiện không
có external IdP; `workspaceId`, `role`, `active`, `lockedAt` và `sessionVersion`
được revalidate server-side. Canonical MCP writer được user cho phép cho mọi
workspace đã cấu hình, nhưng vẫn bind từng `MCP_USER_ID` + `MCP_WORKSPACE_ID`;
không cho payload chọn tenant, không mixed writers và không mở reversal/
compensating transaction.

### Slice B — security evidence

1. Giữ browser/MCP trusted context fail-closed.
2. Bổ sung read-only runtime evidence cho authoritative policy membership nếu
   có thể thu được mà không đọc secret hoặc mutate production; deployed-image
   evidence cho session/role/workspace guard đã được ghi nhận.
3. Chỉ chuyển `GAP-SEC-01/02` sang `CLOSED` khi evidence đúng scope.

### Slice C — MCP fence

1. **Đã hoàn tất capability rollout** bằng chart commit `45b578a`:
   `writerMode: write`, `oldWriterFenced: true`, immutable image
   `7a243ca86684`; không patch Kubernetes trực tiếp.
2. Read-only verification sau rollout: Argo `Synced/Healthy`, pod Ready/restart
   `0`, health/readiness/docs `200`, unauthenticated `/mcp` `401`, OpenAPI
   writer inventory có preview/confirm và `auditStatus=PENDING`.
3. Không gọi financial mutation smoke, không chạy mixed writers và không xóa
   legacy receipt reads khi chưa có production receipt/reconciliation evidence.

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
- stale `docs/database.md` rollout ledger (old pod/backup path; retained the
  current dry-run, backup and rollback policy)
- `frontend/lib/api/statementCalendarEmailCore.d.ts` (declaration không có
  consumer TypeScript; runtime source là `.mjs` và vẫn có regression test)
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
