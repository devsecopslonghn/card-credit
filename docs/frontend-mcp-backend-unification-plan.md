# Plan hợp nhất Frontend, MCP và Backend

## 0. Execution status ledger

This section is the resumable execution log. Update it after every completed
feature, review decision, commit and push. A checked item means the code,
verification evidence and remote commit are complete; a pending item is not
implemented yet.

| Phase | Status | Current checkpoint | Commit/push | Next action |
|---|---|---|---|---|
| Phase 0 — Contract freeze và compatibility ledger | `IN_PROGRESS` | Account, MCP manifest, Catalog, Card read/write, REST docs inventory, runtime REST parity, Statement Read v1 và stateless MCP preview hardening đã validate | `PENDING` / working tree | Commit/push preview hardening; sau đó đối chiếu preview projection còn compatibility |
| Phase 1 — Access & Tenancy + contract foundation | `IN_PROGRESS` | Trusted context, identity revalidation và absolute session expiry đã push; session version và direct routes còn thiếu | `26fc471` / `origin/master` | Chuẩn hóa session version và private adapter coverage |
| Phase 2 — Card Portfolio integrity | `IN_PROGRESS` | Catalog, Card read service và create/update command đã push; delete/merge policy còn thiếu | `514e6e9` / `origin/master` | Chờ user chốt RESTRICT/REASSIGN/CASCADE trước delete/merge; làm REST inventory drift gate |
| Phase 3 — Financial Ledger | `IN_PROGRESS` | Account/Financial Transaction contracts đã push; stateless preview token hardening đã validate; generic persistent command guard còn là decision gate | `PENDING` / working tree | Commit/push preview hardening; sau đó lập decision/backup plan trước idempotency/audit DB |
| Phase 4 — Credit Billing & Settlement | `IN_PROGRESS` | Statement Read v1 đã hoàn tất review, validation và push; payment state transition vẫn legacy | `177b347` / `origin/master` | Tách payment state machine và command guard; không đổi DB nếu chưa có approval |
| Phase 5–8 — Benefits, Planning, Reporting, Engagement | `IN_PROGRESS` | Planning Budget read parity đã push; write command chưa mở | `cc4d333` / `origin/master` | Giữ PUT/upsert và Planning write contract cho slice riêng; tiếp tục runtime REST parity không-DB |
| Phase 9–10 — Compatibility removal + release validation | `PENDING` | Chưa bắt đầu | — | Xóa legacy path và chạy release gates |

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
  catalog admin output còn compatibility aliases và startup sync risk GAP-OPS-01.
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

### Completed checkpoint: Planning Budget read parity (ready to commit)

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
- Commit/push: pending until feature commit and ledger commit are pushed.

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
- Đưa catalog startup sync về explicit operator-controlled policy; readiness chỉ
  báo tình trạng, không silent write baseline.

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
