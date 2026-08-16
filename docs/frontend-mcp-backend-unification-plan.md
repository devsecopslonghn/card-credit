# Plan hợp nhất Frontend, MCP và Backend

## 0. Execution status ledger

This section is the resumable execution log. Update it after every completed
feature, review decision, commit and push. A checked item means the code,
verification evidence and remote commit are complete; a pending item is not
implemented yet.

| Phase | Status | Current checkpoint | Commit/push | Next action |
|---|---|---|---|---|
| Phase 0 — Contract freeze và compatibility ledger | `IN_PROGRESS` | Account, MCP manifest, Catalog, Card read/write, REST docs inventory, runtime REST parity, Statement Read v1, MCP preview hardening, SRS risk ledger, notification, calendar, reminder, one-off calendar email, creditStatements, frontend private-surface guard, smoke report, report UI/API cleanup, benefits report contract, account-card validation, fee read parity, monthly cashback read parity, MCP benefits read tools, duplicate REST/frontend read parity, duplicate MCP read parity, trusted private reads, cash-flow read contract, MCP cash-flow query, REST/MCP parity guard, Fee/Cashback REST command-service boundary, Calendar Subscription command boundary, Calendar Subscription list service, Notes trusted mutation context, Profile trusted mutation context, Workspace owner trusted mutation context, Masterdata trusted admin context, Admin users/audit trusted admin context, Catalog admin trusted admin context, Calendar email trusted identity context, Calendar Subscription contract parity và Masterdata GET contract parity đã push | `1b7bde2` / `origin/master` | Chờ chốt owner/card/year/month filter semantics; giữ payment state |
| Phase 1 — Access & Tenancy + contract foundation | `IN_PROGRESS` | Trusted context, identity revalidation, absolute session expiry, private read adapter revalidation, Notes POST, Profile PATCH, Workspace owner PUT, Masterdata admin, Masterdata GET contract parity, Admin users/audit và Catalog admin trusted admin context đã push; session version và các direct mutation routes còn thiếu | `1b7bde2` / `origin/master` | Chuẩn hóa session version sau DB decision và tiếp tục private mutation adapter coverage |
| Phase 2 — Card Portfolio integrity | `IN_PROGRESS` | Catalog, Card read service, create/update command, canonical duplicate REST/frontend read và duplicate MCP query đã push; delete/merge policy còn thiếu | `318ba16` / `origin/master` | Chờ user chốt RESTRICT/REASSIGN/CASCADE trước delete/merge; làm REST inventory drift gate |
| Phase 3 — Financial Ledger | `IN_PROGRESS` | Account/Financial Transaction contracts, stateless preview token hardening, honest MCP audit metadata và CREDIT account-card validation đã push; generic persistent command guard còn là decision gate | `d0d2c9b` / `origin/master` | Lập decision/backup plan trước idempotency/audit DB |
| Phase 4 — Credit Billing & Settlement | `IN_PROGRESS` | Statement Read v1 và malformed-id fail-closed correction đã push; payment state transition vẫn legacy | `9ef5d33` / `origin/master` | Decision gate với user trước payment state machine/command guard vì ảnh hưởng financial writes; sau đó lập backup/recovery plan |
| Phase 5–8 — Benefits, Planning, Reporting, Engagement | `IN_PROGRESS` | Planning Budget, Notification, private Calendar feed, Payment Reminder, one-off Calendar Email, creditStatements, Frontend private-route guard, report UI cleanup, benefits/report parity, refund-aware fee formula, canonical fee read parity, monthly cashback read parity, MCP benefits read tools, cash-flow read contract, MCP cash-flow query, REST/MCP parity guard, REST Fee/Cashback command services, Calendar Subscription command boundary, Calendar Subscription list service, Notes trusted mutation context, Calendar email trusted identity context và Calendar Subscription contract parity đã push; MCP mutation guard và legacy category migration chưa mở | `368333e` / `origin/master` | Chờ chốt contract filters, cash-flow semantic join và legacy fee-category migration; giữ payment state/command guard riêng |
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

### Decision gate: Payment State Machine and Persistent Command Guard

- Chưa triển khai: `PATCH /api/cards/:id/statements/:statementId/payment` vẫn
  giữ compatibility path; các lỗi đã ghi trong `GAP-PAY-01/02` gồm action
  fallback thành `PAID`, thiếu `repaymentAccountId`, và `REOPEN` không reverse
  `STATEMENT_PAYMENT`/cashflow.
- Không tự ý sửa trong read-parity workstream: state transition sẽ ghi
  `CardStatement` và có thể tạo/đụng `FinancialTransaction`; generic
  idempotency/one-time confirmation/audit cũng cần persistence/concurrency
  decision. Đây là financial/data-impacting change, không thể rollback chỉ bằng
  đổi adapter nếu đã phát sinh dữ liệu mới.
- Cần user chốt trước khi mở implementation: repayment/reversal policy,
  allowed transition matrix, idempotency/audit retention, transaction/CAS
  boundary và backup/recovery target. Sau khi chốt sẽ lập migration/backup plan
  (nếu cần), test fixture/reconciliation và commit riêng.
- Current rollback: giữ nguyên payment compatibility path; các read projections
  đã push không thay đổi payment writes.

### Completed checkpoint: Frontend Private Surface Guard

- Independent review: frontend-only route-boundary slice; session middleware
  bao phủ các application UI/API route hiện hữu, còn card-catalog/auth public
  và calendar subscription feed token được giữ ngoài session guard có chủ đích.
- Changed write-set: `frontend/middleware.ts` thêm private UI prefixes cho
  dashboard/transactions/accounts/budgets/reports/payments/notifications/fees/
  cashback/analytics và private finance API prefixes; `middleware.test.mjs`
  kiểm tra matcher/policy; `package.json` đưa test vào unit inventory.
- Compatibility: unauthenticated UI vẫn redirect `/login?next=...`; private API
  trả envelope `401`; calendar `.ics` feed tiếp tục dùng subscription token,
  không yêu cầu browser session.
- Acceptance evidence: frontend `typecheck`, `lint`, `npm test` pass (74 unit +
  6 integration) và `npm run build` pass; Next build chỉ cảnh báo convention
  `middleware` deprecated, không phải lỗi slice này.
- Database impact: không backend/model/schema/index/migration/data change, không
  cần Kubernetes backup. Rollback bằng revert frontend commit.

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
