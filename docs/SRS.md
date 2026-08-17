# Software Requirements Specification — Card Credit

## 1. Trạng thái và quy ước

| Thuộc tính | Giá trị |
|---|---|
| Phạm vi | `frontend/`, `backend/`, `shared/`, tests, Docker/Jenkins |
| Trạng thái | **AS-IS baseline + TARGET contract + GAP ledger** |
| Ngày baseline | 2026-08-16 |
| Source of truth runtime | MongoDB; backend domain/application services |
| Tài liệu triển khai | [`frontend-mcp-backend-unification-plan.md`](frontend-mcp-backend-unification-plan.md) |

SRS này giữ yêu cầu, ranh giới và tiêu chí nghiệm thu ở mức ngắn gọn. Chi tiết
commit, write-set, review, rollout và evidence nằm trong execution plan. Mỗi mô
tả phải được đọc theo nhãn:

- **AS-IS**: hành vi đã quan sát từ source/test hiện tại.
- **TARGET**: quy tắc đích phải đạt khi hợp nhất.
- **GAP**: chưa được coi là hoàn tất nếu chưa có code và evidence.
- **DECISION**: lựa chọn ảnh hưởng persistence, financial result hoặc public
  contract; phải được chốt trước khi triển khai.

## 2. Mục tiêu và giới hạn

Card Credit quản lý tài chính cá nhân theo workspace: account tiền thật, thẻ tín
dụng, giao dịch, sao kê, thanh toán, chi hộ/hoàn tiền, cashback, phí, ngân sách,
nhắc hạn, calendar và báo cáo. Frontend, REST, MCP và job phải hiển thị hoặc
thay đổi cùng một mô hình nghiệp vụ.

Không nằm trong baseline: lưu PAN/CVV/OTP, tích hợp ngân hàng/payment gateway,
multi-currency (chỉ VND), kế toán kép đầy đủ, OAuth/SSO/MFA và native mobile.
`TRANSFER` có trong enum nhưng create hiện từ chối.

## 3. Kiến trúc và phân tích source

```text
Browser ──> Next.js /api ──> Fastify REST ──┐
MCP ──────> Streamable HTTP ────────────────┼─> application service
Job ──────> trusted adapter ────────────────┘       ├─> domain policy
                                                    ├─> repository/model
                                                    └─> MongoDB
```

| Cấu phần | Trách nhiệm | Source chính |
|---|---|---|
| Frontend shell/UI | App Router, state, accessibility, presentation | `frontend/app`, `frontend/components` |
| Browser clients | Gọi relative `/api/**`, parse canonical DTO/error | `frontend/lib/api` |
| Shared contracts | Runtime schema, DTO, enum, error, version | `shared/src`, `shared/tests` |
| REST adapter | Session → trusted context, parse, envelope/status | `backend/src/*-routes.ts`, `backend/src/app.ts` |
| MCP adapter | Bearer/context, bounded tools, preview/confirm, DTO content | `backend/src/mcp` |
| Application/domain | Use case, authorization scope, financial formula/state | `backend/src/services`, `financial-domain.ts`, `statement-domain.ts` |
| Persistence | Mongoose models/repositories, indexes, transactions | `backend/src/models`, `*-repository.ts` |
| Operations | Health, mail, calendar, reminder, build/reconcile | `backend/src/*`, Dockerfiles, `Jenkinsfile` |

Ràng buộc: adapter không truy cập model hoặc tự tính business rule; frontend
không truy cập MongoDB/MCP token; mọi private read/write scope theo
`workspaceId` và parent resource cùng workspace.

## 4. Tác nhân và quyền

| Tác nhân | Phạm vi |
|---|---|
| Guest | Auth flow, active catalog, health/readiness, tokenized calendar feed |
| User | Dữ liệu tài chính, card, statement, notes, calendar và profile của workspace session |
| Admin | User/workspace owner, catalog, masterdata, audit trong scope được cấp |
| MCP client | Bearer token + `MCP_USER_ID`/`MCP_WORKSPACE_ID` cố định từ server |
| Scheduler/operator | Job identity hoặc admin tool được trusted; không lấy tenant từ payload |

## 5. Capability baseline

| Capability | AS-IS chính | TARGET hợp nhất | GAP đáng chú ý |
|---|---|---|---|
| Access & Tenancy | Session, role, workspace, profile và admin routes; Profile PATCH dùng `ProfileService` | Trusted `ServiceContext`; một application service cho mỗi use case; revalidate identity trước private command | Session version và một số legacy mutation còn phải chuẩn hóa |
| Card Portfolio & Catalog | Catalog active, card snapshot/create/update, duplicate read | Product snapshot là nguồn catalog; REST/MCP/UI dùng cùng card DTO | Delete/merge policy và legacy import cần quyết định |
| Financial Ledger | Account, transaction, persisted financial impact, reports | Một service/query/command cho REST, MCP, UI; integer VND | Fence writer cũ; reconcile legacy writer |
| Credit Billing & Settlement | Statement period/status, payment command, reminder/calendar | State machine + payment transaction/CAS/idempotency/audit chung | Reversal/compensating transaction policy chưa chốt |
| Benefits & Fees | Monthly cashback, card fee, Fee Center, report totals | Query/command services và shared DTO; không cộng trùng benefit | Legacy categories và owner/card/year/month filters |
| Financial Planning | Category, budget status, recurring expense list/create/update/deactivate | Planning write model; status/usage do backend tính; recurring schedule chỉ là cấu hình | Recurring transaction generation chưa có |
| Reporting & Insights | Summary, statement projection, cash-flow/dashboard | Read projections từ authoritative ledger, cùng date-range semantics | Cash-flow semantic join/orphan cleanup |
| Engagement & Communications | Notes, notifications, calendar feed/email, reminders | Trusted context, opaque token, bounded scheduler delivery | SMTP/retry observability và delivery edge cases |

Integration Contracts và Platform & Quality là cross-cutting concerns, không
phải capability nghiệp vụ độc lập.

### Requirement ID index

Các ID dưới đây là stable identifiers, không được tái sử dụng. Nội dung chi tiết
được rút vào các invariant/contract ở mục 6–8 và source/test tương ứng; execution
plan giữ lịch sử triển khai và evidence.

| Nhóm | IDs | Canonical source/consumer |
|---|---|---|
| Auth/access | `AUTH-01..12`, `WSP-01..10` | auth/session/workspace routes, `frontend/lib/api`, auth tests |
| Catalog/card | `CAT-01..12`, `CARD-01..11` | catalog/card services, shared card schemas, card UI/MCP tests |
| Ledger | `ACC-01..07`, `FTX-01..14` | account/transaction services, financial-domain, ledger tests |
| Settlement | `STM-01..11` | statement-domain/query/payment services, statement/payment tests |
| Benefits/fees | `CBF-01..06`, `FEE-01..06` | cashback/fee services, report DTOs, benefits tests |
| Planning | `BUD-01..03`, `REC-01..02` | category/budget/recurring routes and frontend tests |
| Reporting | `REP-01..11` | report/cash-flow services, REST/MCP/frontend parity tests |
| Engagement | `NOTE-01..02`, `NOTIF-01`, `CAL-01..10`, `REM-01..04` | notes/notification/calendar/reminder services and tests |
| Integration | `INT-01..11`, `MCP-01..08` | `shared/src`, REST/MCP manifest, contract/parity tests |
| Platform/security | `OPS-01..05`, `SEC-01..05`, `REL-01..04`, `PERF-01..04` | health/config/server/Docker/Jenkins and verification tests |
| Web/UI/data/docs | `API-01`, `WEB-01`, `UI-01..03`, `A11Y-01..03`, `DATA-01..02`, `DOC-01` | middleware, UI components, model/index policy and documentation tests |
| Payment/report/use cases | `PAY-01..02`, `FR-08`, `UC-01..07` | payment/report contracts, acceptance scenarios and E2E fixtures |

Field-level route/schema inventory belongs in [`docs/api.md`](api.md) and the
runtime registry in `shared/src`; this table is the traceability index, not a
second DTO definition.

## 6. Canonical business rules

Tiền là safe integer VND; ngày nghiệp vụ là `YYYY-MM-DD` hợp lệ trên calendar;
tháng là `YYYY-MM`. Các công thức authoritative chỉ nằm ở domain/service:

```text
personalSpending(EXPENSE) = max(0, amount - reimbursementExpected - refundReceived)
debitCashflow = -amount cho EXPENSE/STATEMENT_PAYMENT qua account tiền thật
                +amount cho REIMBURSEMENT/REFUND/CASHBACK/INCOME qua account tiền thật
creditDebt = +amount cho CREDIT EXPENSE; -amount cho STATEMENT_PAYMENT
receivable = reimbursementExpected của EXPENSE + PAID_FOR_OTHER
```

- Statement duy nhất theo `workspaceId + userCardId + statementDate`.
- Kỳ dùng `(previousStatementDate, statementDate]`; statement snapshot ngày chốt
  và hạn thanh toán.
- `PAID` cần repayment account tiền thật, outstanding > 0 và tối đa một payment
  transaction; kỳ `PAID` không được reopen trực tiếp.
- Cashback ngân hàng, fee thực trả, transaction cashback/refund/reimbursement là
  các event riêng; summary không được double-count.
- Account/card/transaction/statement/benefit/report đều phải kiểm tra workspace,
  active state, parent ownership và amount/date strict contract.

## 7. Contract hợp nhất Frontend–REST–MCP

1. `shared/` là registry duy nhất của runtime schema, DTO, enum, error code và
   contract version. TypeScript type phải derive từ schema; không copy shadow DTO.
2. Một use case có một application service. REST, MCP và job chỉ tạo trusted
   context, parse canonical input, gọi service và bọc transport envelope.
3. Cùng query qua REST/MCP phải dùng cùng filter/service và business DTO; parity
   test so sánh `REST.data` với parsed MCP JSON.
4. Frontend runtime-parse response và render `status`, amount, impact do backend
   tính; compatibility alias chỉ tồn tại ở adapter có owner/removal milestone.
5. OpenAPI, MCP manifest và frontend client phải được kiểm tra drift từ registry;
   unknown field, invalid date/range/id và tenant field phải fail closed.

### MCP command safety

- `/mcp` là Streamable HTTP + Bearer timing-safe; context user/workspace lấy từ
  server config và revalidate mỗi invocation.
- Browser session claim có `sessionVersion` (legacy cookie thiếu claim được
  chuẩn hóa về `0`); mỗi request private phải khớp authoritative user record.
  Password reset và thay đổi role/workspace bump version để revoke session cũ.
- `MCP_WRITER_MODE` mặc định `read`; manifest/helper trực tiếp cũng mặc định
  read-only. `write` chỉ được phép khi operator đã fence old writer và đặt
  `MCP_OLD_WRITER_FENCED=true`; khi đó mới đăng ký preview/confirm mutation
  tools.
- Flow bắt buộc: `preview → human confirmation → idempotent execute → audit`.
  Preview không ghi business data; token HMAC bind operation, actor/channel,
  workspace, canonical payload hash, preview id, contract version và TTL 300s.
- Confirm reauthorize/revalidate, consume preview one-time, reserve idempotency
  atomically, dùng CAS/version và ghi business result + receipt/audit trong cùng
  transaction khi có thể. Không coi idempotency receipt là audit.
- Secret `MCP_PREVIEW_SECRET` riêng tối thiểu 32 ký tự; không fallback
  `AUTH_SECRET`, không log raw token/payload.

## 8. Data, security và vận hành

- Auth/session, role, workspace và parent resource phải được revalidate server-side;
  client/AI không được chọn `userId`, `role`, `workspaceId`, account type, amount,
  payment state hoặc report total.
- Public registration cấp một workspace opaque dẫn xuất ổn định từ normalized
  email; request có `workspaceId` bị reject. Chỉ admin policy mới được chuyển
  user sang workspace khác.
- Mongo transaction/CAS/unique index/TTL phải bảo vệ payment, preview,
  idempotency và scheduler claim. Migration, delete/merge, reconcile và reversal
  cần dry-run, backup/recovery, rollback và DECISION riêng.
- **DECISION-DATA-01 — Card lifecycle**: delete card là soft-retire (`active=false`,
  giữ toàn bộ statements, accounts, transactions, fee/cashback và audit); không
  hard-delete financial history. Merge chỉ áp dụng cho exact duplicate cùng
  workspace/preset/owner và source chưa có domain references. Legacy `monthlyData`
  được cộng vào target; source được giữ như redirect record với
  `mergedIntoCardId`. Nếu source đã có history thì từ chối merge và cho phép
  retire riêng.
- **DECISION-DATA-02 — Calendar subscription uniqueness**: một user/workspace
  chỉ có tối đa một subscription cho cùng `deviceLabel` không rỗng; label rỗng
  vẫn cho phép nhiều subscription. Index partial unique là guard authoritative.
- **DECISION-DATA-03 — Account lifecycle**: account không hard-delete; account
  chỉ chuyển `active=false` sau khi không còn được chọn cho command mới. CREDIT
  account và ledger history giữ nguyên để report/reconciliation không mất dữ liệu.
- **DECISION-DATA-04 — Report source**: financial report/cash-flow đọc từ
  `FinancialTransaction` và statement projection; không rebuild từ card
  `monthlyData`. Card filter là filter theo statement/account reference; orphan
  record được đưa vào reconciliation, không âm thầm cộng vào card khác. Report
  `owner` filter match card owner snapshot trong workspace; `year` và `year`+
  `month` resolve thành calendar range, không trộn với `from/to`.
- `/health` là liveness; `/ready` chỉ 200 khi Mongo connected. Logger redact
  authorization, cookie, password, token và URI. SIGTERM dừng job/server/DB sạch.
- Production image chạy non-root; Jenkins dùng `Jenkinsfile` và `ci-platform`
  để validate `shared` → `frontend` → `backend` từ cùng SHA. Source checkout
  phải chứa `shared/`, mỗi package có lockfile, và dependency runtime phải được
  khai báo trực tiếp ở package dùng nó.
- `cd-platform` là CD adapter riêng: nhận immutable image tag và sửa external
  GitOps repository; push source không đồng nghĩa image đã publish/rollout.
- MCP writer rollout phải bắt đầu bằng candidate `read`, sau đó chỉ bật `write`
  khi canonical writer đã có explicit chart acknowledgement. Theo quyết định
  hiện tại, không có legacy old writer trong scope; không chạy mixed writers.
  Runtime write-mode evidence chỉ chứng minh capability/config, không tự động
  cho phép financial mutation smoke hoặc thay đổi dữ liệu.

## 9. Verification và Definition of Done

Baseline commands:

```bash
cd shared && npm ci && npm run typecheck && npm test
cd ../backend && npm ci && npm run validate
cd ../frontend && npm ci --include=optional && npm run typecheck && npm run lint
cd ../frontend && npm run test:unit --if-present && npm run test:integration
cd ../frontend && npm run build
```

CI gọi một entrypoint test duy nhất là `npm test`, dùng curated regression
cases cho các boundary/rủi ro chính. Full package suites không bị xóa; chạy
`npm run test:all` trong shared, backend hoặc frontend khi cần kiểm tra
exhaustive.

Jenkins thực thi cùng phạm vi qua `sourceDirectories: ['shared', 'frontend',
'backend']`. Khi CI báo `ERR_MODULE_NOT_FOUND` cho `zod`, kiểm tra checkout
SHA/SCM URL/branch và lockfile trước; không bỏ bớt unit test để che lỗi.

Một vertical slice chỉ hoàn tất khi có contract + service/domain + adapter áp
dụng (REST/MCP/UI/job) + persistence/migration nếu cần + workspace/financial/
concurrency/parity tests + SRS/plan/inventory cập nhật. Evidence hiện tại cần
ghi theo commit trong execution plan; không suy diễn từ tài liệu cũ.

## 10. GAP ledger và thứ tự tiếp theo

| Priority | GAP ID | Hiện trạng | Điều kiện đóng |
|---|---|---|---|
| P0 | `GAP-CI-01` | **CLOSED** — Jenkins `#373` checkout đúng proxy source, shared/frontend/backend pass `25/45/135`, publish immutable images, GitOps handoff `952c0fc`, Argo candidate `Synced/Healthy`, pod Ready/restart 0, health/ready và read-only MCP smoke pass | Giữ regression gate trong các release sau |
| P0 | `GAP-SEC-01`, `GAP-SEC-02` | **PARTIAL** — source guard, authoritative lookup, workspace/session checks và atomic `$inc sessionVersion` đã có regression evidence; authoritative version bump/revoke và policy membership runtime evidence còn thiếu | Backend/frontend tests, authoritative version bump và policy membership evidence |
| P0 | `GAP-MCP-01` | **PARTIAL** — canonical manifest, preview/confirm/idempotency guard, REST/MCP adapter tests và chart desired-state read-only guard đã có evidence; live authenticated `tools/list` trả 11 query tools, không có preview/confirm, health/readiness/docs đều `200`; vẫn chưa claim external old-writer traffic fence hoặc financial receipt/audit/reconciliation từ traffic/mutation thật | Xác minh external old-writer traffic fence, giữ preview/confirm/idempotency/audit và production receipt/reconciliation evidence |
| P0 | `GAP-PAY-01`, `GAP-PAY-02`, `GAP-STM-01` | **PARTIAL** — payment contract, state-machine guard, preview/CAS và command tests đã có; chưa ghi persistence/reconciliation và reversal policy chưa được quyết định | Operation-specific approval, persistence/reconciliation evidence và reversal decision |
| P0 | `GAP-OPS-01` | **CLOSED** — startup không còn silent catalog write; CLI/operator guard và regression test đã có | Giữ dry-run/apply guard |
| P1 | `GAP-DATA-01`, `GAP-ACC-01`, `GAP-DATA-02` | **CLOSED** — source policy/tests cho card soft-retire/restricted-merge, account retention và calendar partial-unique index; live data-integrity dry-run xác nhận required indexes tồn tại, duplicate device groups `0`, duplicate card groups `0`, duplicate card IDs `0`; finance read-only audit xác nhận orphan account/card/transaction references đều `0` | Giữ dry-run/index verification và read-only reconciliation trước release |
| P1 | `GAP-REP-01` | **PARTIAL** — benefits/fees report read parity và no-double-count formulas đã có test; legacy category và mutation source-of-truth còn mở | Chốt legacy source/mutation semantics và reconciliation evidence |
| P1 | `GAP-REP-02` | **CLOSED** — authoritative source là financial ledger + statement projection; `cardId` và `owner/year/month` filters đã có REST/MCP/UI parity theo statement/account reference; live read-only audit cho workspace MCP cố định ghi nhận 5 cards, 11 statements, 45 financial transactions, `7/7` paid-statement payment sync, `missingPayments=0` và orphan counts cả 6 loại bằng `0` với source hash ổn định | Giữ read-only orphan/completeness audit trước release |
| P1 | `GAP-UI-02`, `GAP-UI-03` | **PARTIAL** — Reports đã có canonical date-range/card/owner/calendar filters; Budgets và recurring đã có canonical write/lifecycle UI, REST adapter regression `6/6`, shared contracts và regression evidence; recurring transaction generation và UI acceptance runtime còn thiếu, schedule hiện vẫn intentionally không tự ghi financial transaction | Chốt generation policy, thêm preview/idempotency nếu triển khai và có owner/runtime UI acceptance |
| P1 | `GAP-AUTH-01` | **PARTIAL** — forgot-password đã nối MailService với generic response và test delivery; runtime SMTP `transport.verify()` pass tới port `587`/`secure=false`, nhưng chưa có approved-recipient delivery hoặc sender-owner evidence | Gửi connectivity-safe delivery test tới recipient được phép và ghi sender-owner evidence |
| P2 | `GAP-API-01`, `GAP-WEB-01` | Đã đóng: REST inventory drift gate và authorization metadata có runtime regression evidence | Giữ parity tests trong release gate |
| P2 | `GAP-DOC-01` | Đã đóng cho production surface: không còn reference tới `/api/reports/summary`, `reportsCore` hoặc `docs/refactor*` ngoài historical execution ledger; canonical report docs/smoke path đã cập nhật | Giữ stale-reference check khi compatibility window thay đổi |
| P2 | `GAP-PERF-01` | Đã có bounded transaction, calendar subscription, workspace notes, recurring, legacy masterdata, card, duplicate-card, category, fee, admin-audit và query-form admin-user reads; report aggregation đã consume complete sources qua bounded Mongo cursor; card-statement và credit-statement projections có stable opaque cursor/page contract cùng REST/frontend regression evidence | Giữ bounded/paginated coverage, live profile và completeness evidence cho các projection còn lại trước release |

Status key: `CLOSED` nghĩa là GAP đã có đủ source/test/runtime evidence trong phạm
vi ledger; `PARTIAL` nghĩa là phần code/test hoặc capability đã có evidence nhưng
chưa được claim production/financial target; `OPEN` nghĩa là còn thiếu contract,
decision hoặc implementation. Historical checkpoints trong execution plan không
được dùng để nâng trạng thái nếu thiếu evidence mới.

Execution order: (1) contract/drift gates, (2) trusted context + query parity,
(3) generic preview/confirm/idempotency/audit, (4) payment state/reversal, (5)
benefits/planning/reporting/engagement cleanup, (6) compatibility removal and
release validation. Chi tiết resumable nằm trong
[`frontend-mcp-backend-unification-plan.md`](frontend-mcp-backend-unification-plan.md).

## 11. Change control

Mọi thay đổi phải ghi `Requirement/GAP → contract → service → adapter → test →
docs`, có independent review cho quyết định không liên quan database. Không tự
động sửa DB/cluster; nếu thay đổi persistence, dừng ở DECISION, xác định target,
blast radius, backup và rollback rồi mới xin phép. Commit/push sau mỗi feature
đã có evidence và cập nhật execution plan ngay trong cùng checkpoint.
