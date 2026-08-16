# Software Requirements Specification (SRS) — Card Credit

## 1. Kiểm soát tài liệu

| Thuộc tính | Giá trị |
|---|---|
| Sản phẩm | Card Credit / Personal Finance |
| Phiên bản tài liệu | 1.0 |
| Ngày lập baseline | 2026-08-16 |
| Trạng thái | AS-IS baseline + TO-BE integration requirements |
| Phạm vi source | `frontend/`, `backend/`, `shared/`, test, Dockerfile và Jenkinsfile |
| Mục đích | Mô tả yêu cầu phần mềm theo từng cấu phần, giao diện, quy tắc nghiệp vụ, dữ liệu, ràng buộc vận hành và khoảng trống hiện hữu |

Các bảng yêu cầu theo capability ở mục 5 là AS-IS: câu “hệ thống phải” mô tả
contract đang được source hiện tại thực thi hoặc contract tối thiểu cần giữ để
tương thích. Mục 4.2 là TO-BE: contract tích hợp mà Frontend, REST và MCP phải
hướng tới. Các mục trong phần “Khoảng trống và rủi ro” là vấn đề quan sát được,
không được hiểu là hành vi đã đạt yêu cầu.

### 1.1 Nguồn truy vết

- Runtime composition: `backend/src/server.ts`, `backend/src/app.ts`,
  `frontend/next.config.ts`, `frontend/middleware.ts`.
- Business logic: `backend/src/financial-domain.ts`,
  `backend/src/statement-domain.ts`, `backend/src/services/`.
- HTTP/MCP interface: các file `backend/src/*-routes.ts`,
  `backend/src/mcp/`, `frontend/lib/api/`.
- Persistence: `backend/src/models/`, `backend/src/auth-repository.ts`,
  `backend/src/notes.ts`, `backend/src/masterdata.ts`.
- UI capability: `frontend/app/`, `frontend/components/`.
- Acceptance baseline: `backend/tests/`, `frontend/tests/`, `shared/tests/`.

## 2. Mục tiêu và phạm vi sản phẩm

Card Credit là ứng dụng web quản lý tài chính cá nhân theo workspace. Hệ thống
quản lý tài khoản tiền thật, thẻ tín dụng, giao dịch, kỳ sao kê, thanh toán,
cashback, phí, ngân sách, lịch nhắc và báo cáo. Credit card là một phương thức
thanh toán thuộc Financial Domain, không phải toàn bộ mô hình tài chính.

### 2.1 Mục tiêu nghiệp vụ

1. Tách ba góc nhìn tài chính để tránh ghi nhận chi phí hai lần:
   `personalSpending`, `debitCashflow` và `creditDebt`.
2. Quản lý vòng đời thẻ và kỳ sao kê theo đúng workspace.
3. Theo dõi khoản chi hộ, phải thu, hoàn tiền, cashback và phí như các dòng
   nghiệp vụ riêng biệt.
4. Cung cấp dashboard, nhắc hạn, calendar feed và báo cáo từ dữ liệu MongoDB.
5. Cho phép AI đọc dữ liệu và thực hiện mutation có preview, xác nhận và
   idempotency qua MCP.

### 2.2 Ngoài phạm vi hiện tại

- Lưu PAN, CVV, OTP hoặc thông tin đăng nhập ngân hàng.
- Đồng bộ trực tiếp với ngân hàng hoặc payment gateway.
- Chuyển tiền hai đầu giữa các account; transaction type `TRANSFER` tồn tại
  trong enum nhưng create service chủ động từ chối.
- Multi-currency; currency hiện chỉ có `VND`.
- General ledger/kế toán kép đầy đủ.
- OAuth/OIDC, SSO hoặc MFA.
- Mobile native app.

## 3. Tác nhân và quyền

| Tác nhân | Mô tả | Quyền chính |
|---|---|---|
| Khách chưa đăng nhập | Browser chưa có session | Register, login, forgot/reset password, đọc active Card Catalog, health/readiness; calendar feed dùng token riêng |
| User | Thành viên có session | Đọc/ghi dữ liệu tài chính, thẻ, sao kê, lịch và hồ sơ trong workspace của session |
| Admin | User có `role=admin` | Quyền user và quản lý user, workspace owner, catalog, masterdata, audit log |
| MCP client | OpenClaw/Codex hoặc client tương thích | Dùng Bearer token và context user/workspace cố định do server cấu hình |
| Calendar client | Apple Calendar hoặc client `.ics` | Đọc feed riêng tư bằng raw token; không dùng session cookie |
| Reminder scheduler | Background worker trong backend | Quét statement đến hạn, claim delivery và gửi SMTP |
| Operator/CI-CD | Người hoặc pipeline vận hành | Build image, validate, import/repair/audit dữ liệu bằng script có guard |

## 4. Kiến trúc và phân rã cấu phần

```text
Browser / Calendar client / MCP client
        | same-origin /api, private feed, Bearer /mcp
        v
Next.js frontend :3000 ---- internal rewrite ----> Fastify backend :3001
  UI + browser clients                             auth + routes + services
                                                        |            |
                                                        v            v
                                                     MongoDB       SMTP relay
```

| Cấu phần | Trách nhiệm | Source chính |
|---|---|---|
| Frontend shell | App Router, navigation, responsive UI, client-side state | `frontend/app`, `frontend/components` |
| Browser API clients | Gọi relative `/api/**`, parse response/error | `frontend/lib/api` |
| Shared contracts | Error envelope framework-free dùng chung | `shared/src` |
| Backend transport | Fastify routes, auth boundary, input parsing, response | `backend/src/app.ts`, `backend/src/*-routes.ts` |
| Domain/services | Tính impact tài chính, statement period, orchestration | `backend/src/financial-domain.ts`, `backend/src/statement-domain.ts`, `backend/src/services` |
| Persistence | Mongoose models và repository MongoDB | `backend/src/models`, các `*-repository.ts` |
| Catalog | Public read, admin write, baseline import/sync | `catalog*.ts`, `mongo-catalog-repository.ts` |
| Calendar/mail/reminder | `.ics`, SMTP và scheduled delivery | `calendar-*`, `mail-service.ts`, `reminder-*` |
| MCP | Streamable HTTP, tool schemas, preview/confirm | `backend/src/mcp` |
| Operations | Build, validation, migration/reconciliation | Dockerfile, Jenkinsfile, `backend/scripts` |

### 4.1 Ràng buộc kiến trúc

- Frontend không được truy cập MongoDB; backend sở hữu auth, authorization,
  business logic và persistence.
- Browser gọi relative `/api/**`; Next.js rewrite sang `BACKEND_INTERNAL_URL`.
- MongoDB là runtime source of truth.
- REST, MCP và background job phải tái sử dụng service/domain thay vì tự tính
  financial impact độc lập.
- Mọi private query phải được scope bằng `workspaceId` hoặc parent resource đã
  kiểm tra workspace.
- Tiền là safe integer VND; ngày nghiệp vụ là chuỗi ISO `YYYY-MM-DD`, kỳ tháng
  là `YYYY-MM`.
- Các operation dùng MongoDB transaction cần MongoDB deployment hỗ trợ session/
  transaction, thông thường là replica set hoặc managed cluster tương thích.
- Khi MCP remote được bật, `MCP_PREVIEW_SECRET` riêng (tối thiểu 32 ký tự) là bắt
  buộc; không fallback sang `AUTH_SECRET`. Preview token v1 là HMAC stateless,
  TTL canonical 300 giây, chỉ chứa hash payload/context và bind operation,
  workspace, actor và channel. Token chưa phải one-time human approval; generic
  idempotency reservation, audit append-only và replay prevention vẫn là GAP
  của command infrastructure.

### 4.2 Kiến trúc tích hợp mục tiêu

Mỗi capability chỉ có một application service và một bộ contract canonical.
Frontend/REST, MCP và background job là adapter; chúng được phép khác auth và
transport nhưng không được khác validation, business rule, state transition
hoặc DTO nghiệp vụ.

```text
Frontend UI --------> REST adapter ----+
MCP client ---------> MCP adapter -----+--> Application service
Scheduler/job ------> Job adapter -----+      -> Domain policy
                                               -> Repository
                                               -> MongoDB

shared contracts -> input/output DTO + enum + error code
backend           -> auth/context + validation + use case + persistence
frontend/MCP      -> presentation/parsing only, no authoritative calculation
```

| ID | Yêu cầu tích hợp TO-BE |
|---|---|
| INT-01 | Mỗi use case phải có đúng một application service canonical; REST, MCP và job chỉ resolve trusted context, validate transport rồi gọi service đó. |
| INT-02 | `shared/` phải là source duy nhất cho DTO, enum, error code và contract version dùng qua runtime; không duy trì type tương đương bằng copy thủ công ở Frontend và MCP. |
| INT-03 | Authoritative totals, financial impact, statement state và eligibility phải do backend domain/service tính; Frontend và MCP chỉ hiển thị kết quả. |
| INT-04 | Cùng một query qua REST và MCP phải dùng cùng filter object/service và trả cùng business DTO, chỉ khác transport envelope. |
| INT-05 | Cùng một command phải dùng cùng validation/domain policy. MCP mutation luôn theo `preview -> human confirmation -> idempotent execute`; browser mutation rủi ro cao phải dùng cùng preview/execute service dù UX xác nhận có thể khác. |
| INT-06 | `ServiceContext` phải được tạo từ session đã revalidate, MCP fixed context hoặc trusted job identity; client không được truyền tenant/user/role để quyết định scope. |
| INT-07 | Compatibility adapter phải có owner, test, telemetry và removal milestone; không được trở thành nguồn tính toán thứ hai. |
| INT-08 | Mỗi vertical slice phải hoàn thành đồng bộ contract, domain/service, REST, MCP nếu applicable, Frontend, persistence/migration, test và tài liệu trước khi chuyển slice. |
| INT-09 | OpenAPI, MCP tool schema và browser client phải được kiểm tra drift với canonical contract trong CI/local validation. |
| INT-10 | Mọi command tài chính phải định nghĩa idempotency, audit, concurrency, rollback và reconciliation trước khi expose qua adapter mới. |

## 5. Yêu cầu chức năng theo cấu phần

Các requirement được gom theo tám business capabilities và hai nhóm
cross-cutting. Business capability là đơn vị planning, ownership và verification;
không chia task chỉ theo “Frontend” hoặc “Backend” nếu làm vậy tạo ra một luồng
chưa dùng được.

| Capability | Source of truth | Adapter/consumer |
|---|---|---|
| Access & Tenancy | Auth/session policy, User, Workspace | Auth/Profile UI, REST, MCP context |
| Card Portfolio | Card Product snapshot và CreditCard lifecycle | Card/Admin UI, REST, MCP compare |
| Financial Ledger | Account, FinancialTransaction và financial impact | Dashboard/Transaction UI, REST, MCP |
| Credit Billing & Settlement | CardStatement và payment state machine | Card/Payment UI, REST, MCP |
| Benefits & Fees | Cashback, fee, reimbursement policies | Cashback/Fee UI, REST, report/MCP |
| Financial Planning | Category, budget và recurring write models | Budget/Recurring UI, REST, MCP nếu duyệt |
| Reporting & Insights | Canonical query/read models, không sở hữu write collection | Dashboard/Report UI, export, REST, MCP |
| Engagement | Notification, calendar, reminder delivery | Profile/Notification UI, feed, SMTP/job |

Hai nhóm cross-cutting:

| Nhóm | Phạm vi | Consumer |
|---|---|---|
| Integration Contracts | Shared contract, REST/MCP/job adapters, preview/confirm | Mọi business capability |
| Platform & Quality | Lifecycle, security, observability, docs, migration, CI/CD | Mọi capability, operator và verification agents |

### 5.1 Access & Tenancy

#### 5.1.1 Identity, session và password

| ID | Yêu cầu |
|---|---|
| AUTH-01 | Hệ thống phải cho phép register bằng email hợp lệ và password tối thiểu 8 ký tự; email được trim và lowercase. |
| AUTH-02 | User đầu tiên trong database phải được cấp role `admin`; các user sau mặc định là `user`. |
| AUTH-03 | Khi register, `workspaceId` lấy từ request nếu có; nếu không, hệ thống sinh từ local-part của email. Đây là hành vi AS-IS và được đánh dấu rủi ro tại mục 13. |
| AUTH-04 | Password phải được hash bằng `scrypt` với salt ngẫu nhiên trước khi lưu. |
| AUTH-05 | Login phải trả cùng một lỗi chung khi user không tồn tại, bị khóa, inactive hoặc password sai. |
| AUTH-06 | Login/register thành công phải tạo cookie `card_credit_session` được ký HMAC-SHA256, `Path=/`, `HttpOnly`, `Secure`, `SameSite=Lax`. |
| AUTH-07 | `GET /api/auth/me` phải trả email, role và workspace từ session hợp lệ; logout phải xóa cookie. |
| AUTH-08 | Forgot password phải luôn trả thông báo chung; nếu account hợp lệ, backend tạo raw token 32 byte, chỉ lưu SHA-256 hash và expiry 30 phút. |
| AUTH-09 | Reset password phải kiểm tra token chưa dùng/còn hạn, cập nhật password hash, consume mọi reset token còn mở của user và xóa session hiện tại. |
| AUTH-10 | Bootstrap user chỉ hoạt động khi có `AUTH_BOOTSTRAP_TOKEN` và `AUTH_USERS_JSON`; request phải mang Bearer token hoặc `x-bootstrap-token`. |
| AUTH-11 | Auth event và catalog admin mutation phải ghi audit metadata nhưng không ghi password, cookie hoặc raw token. |

#### 5.1.2 Workspace, profile và RBAC

| ID | Yêu cầu |
|---|---|
| WSP-01 | Backend phải lấy `userId`, `role`, `workspaceId` từ signed session, không lấy các field này từ body cho domain operation thông thường. |
| WSP-02 | User được xem hồ sơ hiện tại và chỉ tự sửa `displayName` tối đa 80 ký tự. |
| WSP-03 | User không được tự sửa email, role, workspace, active hoặc locked state qua profile API. |
| WSP-04 | Admin được list toàn bộ user và sửa allowlist `displayName`, `role`, `workspaceId`. |
| WSP-05 | Admin được cấu hình `ownerUserId` của workspace nếu user đích active, không khóa và thuộc cùng workspace. |
| WSP-06 | UI middleware chỉ là UX guard; backend session/RBAC là authority cuối cùng. |

### 5.2 Card Portfolio

#### 5.2.1 Card Catalog và legacy masterdata

| ID | Yêu cầu |
|---|---|
| CAT-01 | Public API phải list provider/product active và đọc product active theo `presetId`. |
| CAT-02 | Filter provider phải được normalize uppercase; provider không có product active trả `404 PROVIDER_NOT_FOUND`. |
| CAT-03 | Product phải có `presetId` kebab-case duy nhất, provider code uppercase, network thuộc allowlist, sort order duy nhất, source date hợp lệ và HTTP(S) source URL khi active. |
| CAT-04 | Admin được tạo product, sửa product theo field allowlist và bulk-update `providerName`/`active`; mỗi mutation phải validate toàn catalog và ghi audit. |
| CAT-05 | `presetId` là immutable trong Mongo model. Product inactive không xuất hiện trong public picker. |
| CAT-06 | Baseline `frontend/data/card-presets.json` phải được validate trước khi import. CLI import mặc định dry-run; apply production cần `ALLOW_PRODUCTION_CATALOG_IMPORT=true`. |
| CAT-07 | Runtime hiện gọi startup catalog sync ở chế độ apply; hành vi này phải được coi là source behavior hiện tại và được xử lý trong rủi ro GAP-OPS-01. |
| CAT-08 | Legacy `banks` và `cardtypes` cho phép authenticated read, admin create/update/delete và duplicate check không phân biệt hoa thường khi create. Dữ liệu legacy là global collection, không scope workspace. |

#### 5.2.2 User card

| ID | Yêu cầu |
|---|---|
| CARD-01 | User phải list/get card trong workspace của session. |
| CARD-02 | Create theo catalog phải nhận `presetId` active và `owner`; backend snapshot identity, fee, image và waiver target từ Card Product vào `CreditCard`. |
| CARD-03 | Legacy create contract vẫn được hỗ trợ nếu có `bank`, `name`, `type`, `imageUrl`; response phải có header deprecation. |
| CARD-04 | Owner phải khác rỗng, tối đa 120 ký tự, trim và collapse khoảng trắng. |
| CARD-05 | Update chỉ cho phép operational fields: owner, waiver target, statement day, due days, cashback cap/period, active và reminder preferences. Catalog snapshot không được sửa qua user endpoint. |
| CARD-06 | `statementDay` phải từ 1..31; `paymentDueDays` là integer dương; cashback period là `STATEMENT` hoặc `CALENDAR_MONTH`. |
| CARD-07 | Hệ thống phải phát hiện exact duplicate theo `workspaceId + presetId + normalizedOwner`. |
| CARD-10 | Duplicate read phải dùng canonical `CardDuplicateGroupDto` với `id` card và không expose `workspaceId`/`userId`; REST/frontend chỉ giữ aliases ở compatibility boundary. |
| CARD-08 | Merge duplicate AS-IS chỉ cộng `monthlyData` theo tháng vào target rồi xóa source. Không có cascade/relink các entity mới; xem rủi ro GAP-DATA-01. |
| CARD-09 | Delete AS-IS chỉ xóa document card theo workspace; không cascade statement/account/cashback/fee. |

### 5.3 Financial Ledger

#### 5.3.1 Account

| ID | Yêu cầu |
|---|---|
| ACC-01 | Account type gồm `DEBIT`, `CASH`, `E_WALLET`, `CREDIT`; ba loại đầu thuộc `REAL_MONEY`, `CREDIT` thuộc `DEBT`. |
| ACC-02 | Account phải có name 1..120 ký tự, currency `VND`, opening balance là safe integer không âm. |
| ACC-03 | Chỉ account `CREDIT` được nhận `creditCardId`; nếu có liên kết thì card phải tồn tại, active và cùng workspace; một card tối đa liên kết một account nhờ unique partial index. CREDIT không có `creditCardId` vẫn hợp lệ. |
| ACC-04 | List account phải trả opening balance, current balance cho real-money và current debt cho credit account. |
| ACC-05 | Current real-money balance bằng opening balance cộng tổng `debitCashflow`. Current credit debt bằng opening balance cộng charge debt và trừ statement payment được map theo card. |
| ACC-06 | REST cho phép list/create. MCP chỉ cho preview/create các account real-money. |
| ACC-07 | MCP create phải hỗ trợ idempotency theo `workspaceId + operation + idempotencyKey` và từ chối cùng key với payload khác. |

#### 5.3.2 Financial Transaction và financial impact

| ID | Yêu cầu |
|---|---|
| FTX-01 | Transaction type gồm `EXPENSE`, `REIMBURSEMENT`, `REFUND`, `CASHBACK`, `INCOME`, `STATEMENT_PAYMENT`; `TRANSFER` chưa được hỗ trợ khi create. |
| FTX-02 | Create phải kiểm tra account active trong cùng workspace, amount safe integer dương, ngày hợp lệ và note tối đa 1000 ký tự. |
| FTX-03 | Account type phải được đọc từ account phía server, không tin `accountType` từ client. |
| FTX-04 | Credit expense phải tăng `creditDebt` và không giảm `debitCashflow`. |
| FTX-05 | Expense qua real-money account phải giảm `debitCashflow`; reimbursement/refund/cashback/income qua real-money account phải tăng `debitCashflow`. |
| FTX-06 | Statement payment phải giảm real-money cashflow, giảm credit debt ở góc nhìn tổng hợp và không tạo thêm personal spending. |
| FTX-07 | `PAID_FOR_OTHER` phải ghi nhận `outstandingReceivable`; phần personal spending chỉ là phần không kỳ vọng được hoàn. |
| FTX-08 | Với credit `PAID_FOR_OTHER`, `serviceFeeRate` là bắt buộc và `reimbursementExpected = round(amount × (1 - serviceFeeRate/100))`. |
| FTX-09 | `reimbursementExpected + refundReceived` không được lớn hơn amount. |
| FTX-10 | Nếu có `reimbursementForTransactionId`, transaction nguồn phải là expense `PAID_FOR_OTHER` trong cùng workspace. |
| FTX-11 | Mỗi financial impact phải được tính một lần trong domain service và persist để audit/reporting. |
| FTX-12 | List hỗ trợ filter `accountId`, `categoryId`, `from`, `to`, sort ngày giảm dần rồi created time giảm dần. |
| FTX-13 | MCP import batch phải chứa 1..50 item, chạy trong MongoDB transaction và dùng idempotency key tối thiểu 8 ký tự. |

### 5.4 Credit Billing & Settlement

#### 5.4.1 Statement và thanh toán

| ID | Yêu cầu |
|---|---|
| STM-01 | Khi ghi transaction trên CREDIT account, backend phải tìm card liên kết, tính kỳ và upsert statement duy nhất theo `workspaceId + userCardId + statementDate`. |
| STM-02 | Kỳ statement thỏa `previousStatementDate < transactionDate <= statementDate`; ngày chốt phải clamp về ngày cuối tháng nếu cần. |
| STM-03 | Statement phải snapshot `statementDay` và `paymentDueDays` để thay đổi card config không sửa lịch sử kỳ đã tạo. |
| STM-04 | Stored status gồm `OPEN`, `STATEMENT_CLOSED`, `PAID`, `OVERDUE`; effective `OVERDUE` được suy ra khi chưa paid và due date nhỏ hơn ngày hiện tại. |
| STM-05 | API phải list statement toàn workspace, list theo card và đọc detail gồm transaction/summary. |
| STM-06 | Action `CLOSED` chuyển kỳ sang `STATEMENT_CLOSED` và không được áp dụng trực tiếp lên kỳ đã paid. |
| STM-07 | Action `PAID` phải dùng real-money repayment account khi amount lớn hơn 0, tạo tối đa một `STATEMENT_PAYMENT` theo statement và cập nhật paid metadata trong một MongoDB transaction. |
| STM-08 | Repayment account lấy từ request `repaymentAccountId` hoặc fallback `FINANCE_DEFAULT_REPAYMENT_ACCOUNT_ID`. |
| STM-09 | Action `REOPEN` AS-IS đưa kỳ về `STATEMENT_CLOSED` và xóa paid metadata; payment transaction hiện không bị xóa/reverse. |
| STM-10 | Legacy statement summary adapter loại `STATEMENT_PAYMENT`, map Financial Transaction sang contract cũ rồi tính total due, fee, cashback cap và profit. |

### 5.5 Benefits & Fees

#### 5.5.1 Cashback và fee

| ID | Yêu cầu |
|---|---|
| CBF-01 | Monthly bank cashback phải unique theo `workspaceId + userCardId + period`. |
| CBF-02 | List monthly cashback yêu cầu card trong workspace và query `year=YYYY`. |
| CBF-03 | Upsert phải nhận expected amount không âm, status `PENDING|RECEIVED|REJECTED`, note tối đa 1000 ký tự. |
| CBF-04 | `RECEIVED` bắt buộc actual amount không âm và set `receivedAt`; repeated upsert ở trạng thái received phải giữ thời điểm nhận đầu tiên. Status khác lưu actual amount là `null`. |
| CBF-05 | Monthly cashback GET dùng canonical `MonthlyCashbackDto` gồm `id`, `cardId`, period, expected/actual amount, status, receivedAt và note; không expose Mongo aliases hoặc tenant fields. |
| CBF-06 | REST cashback upsert/delete phải đi qua `MonthlyCashbackCommandService` với trusted browser context; giữ nguyên unique workspace/card/period semantics và không tự nhận tenant/user từ payload. |
| FEE-01 | Card-specific fee API quản lý phí thẻ thực tế theo card: list/create/update/delete, positive integer VND, ngày hợp lệ, note tối đa 1000 ký tự. |
| FEE-02 | Fee Center dùng cùng collection nhưng mở rộng category: `ANNUAL_CARD_FEE`, `MANAGEMENT_FEE`, `OTHER_FEE`, `BANK_CASHBACK`, `PARTNER_REFUND`. |
| FEE-03 | Fee Center list hỗ trợ filter card/category và trả snapshot card phục vụ hiển thị; read response dùng canonical `FeeCenterRecordDto` với `id`, `cardId` và `card`. |
| FEE-04 | Cashback/fee record không tự thay đổi statement debt. Financial summary đọc các collection này qua canonical report service; `BANK_CASHBACK` và `PARTNER_REFUND` chỉ là compatibility categories, không tính vào paid card fees. |
| FEE-05 | Card fee history và Fee Center GET phải đi qua cùng `FeeQueryService`/shared runtime schema. Card-specific read trả `FeePaymentDto`; Fee Center read trả `FeeCenterRecordDto`; REST envelope và frontend compatibility adapter không được tự tính business rule. |
| FEE-06 | REST card-fee và Fee Center create/update/delete phải đi qua `FeeCommandService` với trusted browser context; adapter chỉ giữ validation/error/envelope compatibility và không import model trực tiếp. Preview-confirm, idempotency và append-only audit cho mutation chưa thuộc yêu cầu đã triển khai. |

### 5.6 Financial Planning

#### 5.6.1 Category, budget và recurring expense

| ID | Yêu cầu |
|---|---|
| BUD-01 | Hệ thống phải list category active theo workspace, tạo category uppercase duy nhất và có thể idempotently seed bộ default. |
| BUD-02 | Budget phải unique theo workspace, month và category; limit là integer dương, warning mặc định 80%. |
| BUD-03 | Budget usage phải cộng `personalSpending` theo category trong tháng và trả `SAFE`, `WARNING` hoặc `EXCEEDED`. |
| REC-01 | Recurring expense hiện chỉ hỗ trợ frequency `MONTHLY`, account thuộc workspace, expected amount dương và next due date hợp lệ. |
| REC-02 | REST hiện chỉ hỗ trợ list/create recurring expense; chưa có update/delete/generation job. |

### 5.7 Reporting & Insights

#### 5.7.1 Báo cáo, dashboard và cash flow

| ID | Yêu cầu |
|---|---|
| REP-01 | Financial summary phải tổng hợp theo inclusive date range và tách totals theo category, account type và account. |
| REP-02 | Totals phải gồm personal spending, debit cashflow, credit debt, outstanding receivable, reimbursement received và transaction count. |
| REP-03 | Outstanding receivable tổng hợp phải trừ các `REIMBURSEMENT` liên kết với expense chi hộ và không nhỏ hơn 0. |
| REP-04 | Credit statement projection phải trả gross charges, payments, personal spending, outstanding receivable, count và outstanding debt. |
| REP-05 | Monthly cash-flow compatibility endpoint phải đọc Financial Domain, group theo card và tháng, không đọc collection card transaction cũ; REST/frontend dùng `MonthlyCashFlowResponseDto`, còn formula join hiện tại được giữ nguyên trong `CashFlowQueryService`. |
| REP-06 | Dashboard tài chính hiển thị summary tháng hiện tại và tối đa sáu transaction gần nhất. Dashboard thẻ hiển thị debt/due, statement sắp đến và cash flow theo card. |
| REP-07 | Financial summary totals phải có `totalServiceFee`, `transactionCashbackActual`, `monthlyBankCashbackExpected`, `monthlyBankCashbackActual`, `monthlyBankCashbackRejected`, `totalPaidCardFees` và `actualNetBenefit`. |
| REP-08 | `actualNetBenefit = monthlyBankCashbackActual - totalServiceFee - totalPaidCardFees`; transaction cashback chỉ là KPI đối chiếu và không cộng lần hai. Monthly cashback tính theo tháng giao với range; `RECEIVED` mới tính actual, `REJECTED` dùng expected. `totalServiceFee` của expense `PAID_FOR_OTHER` là `max(amount - reimbursementExpected - refundReceived, 0)`. |

### 5.8 Engagement & Communications

#### 5.8.1 Note, notification, calendar, email và reminder

| ID | Yêu cầu |
|---|---|
| NOTE-01 | Note được list theo workspace; POST với content khác rỗng là upsert theo date, content rỗng là delete. |
| NOTE-02 | Private Notes POST phải tạo trusted browser context đã revalidate user/workspace trước khi gọi repository; client không được quyết định workspace. |
| NOTIF-01 | Notification API phải project statement trong workspace thành `success`, `warning` hoặc `alert`, giới hạn 1..100 item và không tạo nguồn payment authority mới. |
| CAL-01 | User có thể yêu cầu gửi một file `.ics` cho statement; recipient phải được đọc lại từ account server-side và request không được chọn email nhận. |
| CAL-02 | Calendar email phải mask recipient trong response/log, map lỗi cấu hình SMTP thành 503 và lỗi delivery thành 502 mà không lộ provider detail. |
| CAL-03 | User có thể tạo calendar subscription với device label tùy chọn tối đa 80 ký tự; raw token 32 byte chỉ trả một lần, database chỉ lưu SHA-256 hash. |
| CAL-04 | User chỉ list/revoke subscription của chính mình trong workspace. Feed token sai, revoked hoặc account không khả dụng phải trả opaque 404. |
| CAL-05 | Feed chỉ gồm unpaid statement của card gắn trực tiếp với `subscription.userId` trong workspace. |
| CAL-06 | Mỗi event bắt đầu 00:00 trước due date ba ngày, kết thúc 17:00 due date và có ba display alarm theo serializer hiện tại. |
| CAL-07 | REST create/revoke calendar subscription phải đi qua service với trusted browser context; raw token không được log hoặc lưu plaintext, còn feed `lastAccessedAt` là compatibility write riêng. |
| REM-01 | Card reminder cho phép enable, 1..10 offset duy nhất trong 0..60 ngày, IANA timezone hợp lệ và giờ `HH:mm`. |
| REM-02 | Scheduler phải scan theo local date/time của card, không chạy chồng một scan trong cùng process và chỉ xét active card/unpaid statement. |
| REM-03 | Delivery phải unique theo workspace, statement và days-before; claim hết hạn được reclaim theo timeout. |
| REM-04 | SMTP failure retry tối đa ba attempt với backoff 1 phút, 5 phút, 30 phút; recipient không khả dụng phải `SKIPPED`. |

### 5.9 Integration Contracts

#### 5.9.1 MCP

| ID | Yêu cầu |
|---|---|
| MCP-01 | `/mcp` phải dùng Streamable HTTP và Bearer token so sánh timing-safe. |
| MCP-02 | MCP chỉ hoạt động khi cấu hình `MCP_HTTP_TOKEN`, `MCP_WORKSPACE_ID`, `MCP_USER_ID`; AI không được chọn tenant/user trong tool arguments. |
| MCP-03 | Read tools hiện có: `get_statement_summary`, `list_transactions`, `get_monthly_cash_flow`, `compare_cards`, `list_duplicate_cards`, `list_card_fee_payments`, `list_fee_center`, `list_monthly_cashbacks`, `list_upcoming_statements`, `get_personal_finance_summary`, `list_accounts`; mỗi tool gọi canonical query service và trả shared DTO. |
| MCP-04 | Mutation tools hiện có: `preview_create_account`/`confirm_create_account` và `preview_import_financial_transaction`/`confirm_import_financial_transaction`. |
| MCP-05 | Preview token phải bind HMAC với operation, exact payload và expiry; confirm phải kiểm tra token trước khi ghi. |
| MCP-06 | Confirm mutation phải có idempotency key; payload khác dùng cùng key phải trả conflict. |
| MCP-07 | MCP response phải là text content chứa JSON DTO, không trả Mongoose document trực tiếp. |

### 5.10 Platform & Quality

#### 5.10.1 Health, API docs và lifecycle

| ID | Yêu cầu |
|---|---|
| OPS-01 | `/health` phản ánh process liveness; `/ready` trả 503 cho tới khi MongoDB connected. |
| OPS-02 | Backend phải redact authorization, cookie, password, token và MongoDB URI trong Fastify logger. |
| OPS-03 | SIGTERM/SIGINT phải dừng scheduler, đóng Fastify, disconnect MongoDB và có shutdown timeout. |
| OPS-04 | Swagger UI mặc định ở `/docs`, có thể tắt bằng `API_DOCS_ENABLED=false`; OpenAPI JSON do plugin cung cấp. |
| OPS-05 | Frontend/backend production container phải chạy non-root; frontend dùng Next standalone output. |

## 6. Phụ lục A — Quy tắc nghiệp vụ và công thức

### 6.1 Financial Domain

```text
grossAmount = amount

personalSpending(EXPENSE) =
  max(0, amount
         - (ownership == PAID_FOR_OTHER ? reimbursementExpected : 0)
         - refundReceived)

debitCashflow =
  -amount  nếu account != CREDIT và type thuộc EXPENSE, STATEMENT_PAYMENT
  +amount  nếu account != CREDIT và type thuộc REIMBURSEMENT, REFUND, CASHBACK, INCOME
  0        trong các trường hợp còn lại

creditDebt =
  +amount  nếu CREDIT + EXPENSE
  -amount  nếu STATEMENT_PAYMENT
  0        trong các trường hợp còn lại

outstandingReceivable =
  reimbursementExpected nếu EXPENSE + PAID_FOR_OTHER, ngược lại 0
```

### 6.2 Kỳ sao kê

```text
previousStatementDate < transactionDate <= statementDate
paymentDueDate = statementDate + paymentDueDaysSnapshot
unique statement = workspaceId + userCardId + statementDate
effectiveStatus = OVERDUE nếu chưa PAID và paymentDueDate < today
```

Ngày chốt của tháng được clamp về ngày cuối tháng. Ví dụ statement day 31 trong
tháng 2 sẽ dùng 28 hoặc 29.

### 6.3 Legacy statement projection

Adapter statement hiện map một Financial Transaction sang contract cũ:

```text
outcomeAmount = transaction.amount
incomeAmount = transaction.reimbursementExpected
cashbackRateBps = transaction.serviceFeeRate * 100
actualCashbackAmount = transaction.cashbackReceived

serviceFee = outcomeAmount - incomeAmount
cashbackByRate = round(outcomeAmount * cashbackRateBps / 10000)
eligibleCashback = min(cashbackByRate, cashbackCap nếu có)
expectedNetProfit = eligibleCashback - serviceFee
totalAmountDue = sum(outcomeAmount)
```

Đây là compatibility projection, không phải công thức gốc của Financial Domain.
Các sai khác semantics được ghi tại rủi ro GAP-STM-01.

### 6.4 Budget

```text
usedAmount = sum(personalSpending theo workspace + category + month)
usagePercent = usedAmount / limitAmount * 100
status = EXCEEDED nếu >= 100%
         WARNING  nếu >= warningPercent
         SAFE     nếu còn lại
```

## 7. Phụ lục B — Luồng nghiệp vụ và acceptance scenario

### UC-01 — Đăng ký và vào workspace

1. Khách nhập email/password/display name và tùy chọn workspace.
2. Backend normalize, kiểm tra duplicate và hash password.
3. User đầu tiên là admin, user sau là user.
4. Backend phát signed session cookie và browser chuyển tới ứng dụng.

Kết quả chấp nhận: account được persist, password không xuất hiện trong response,
cookie có security attributes và private API nhận diện đúng workspace.

### UC-02 — Thêm thẻ từ catalog

1. Browser tải provider/product active.
2. User chọn product và owner.
3. Backend đọc lại product, từ chối inactive/missing, snapshot product vào card.
4. Dashboard reload card, statement và duplicate group.

Kết quả chấp nhận: card giữ thông tin lịch sử dù catalog thay đổi sau đó.

### UC-03 — Ghi credit expense và sinh statement

1. Client chọn CREDIT account đã liên kết card.
2. Backend validate transaction và tính Financial Impact.
3. Backend tính statement period từ ngày giao dịch và cấu hình card.
4. Statement được upsert theo unique key; transaction tham chiếu statement.

Kết quả chấp nhận: debt tăng, debit cashflow chưa giảm, personal spending chỉ
phản ánh phần thuộc cá nhân.

### UC-04 — Thanh toán statement

1. User chọn statement chưa paid và real-money repayment account.
2. Backend tạo `STATEMENT_PAYMENT` nếu chưa có và cập nhật statement trong một
   Mongo transaction.
3. Financial summary giảm real-money cashflow và credit debt nhưng không tăng
   personal spending.

Điều kiện hiện tại: frontend payment client chỉ gửi action, vì vậy cần
`FINANCE_DEFAULT_REPAYMENT_ACCOUNT_ID` nếu statement có amount lớn hơn 0.

### UC-05 — Chi hộ và nhận hoàn

1. Expense được ghi với `PAID_FOR_OTHER`; credit case bắt buộc service fee rate.
2. Backend tính expected receivable và phần personal spending.
3. Khi nhận hoàn, tạo `REIMBURSEMENT` tham chiếu expense nguồn.
4. Report trừ reimbursement khỏi outstanding receivable.

### UC-06 — Calendar subscription

1. User tạo subscription và nhận URL raw đúng một lần.
2. User thêm URL vào calendar client.
3. Client gọi feed; backend hash token để lookup, kiểm tra account và project
   unpaid statement.
4. Revoke làm feed trả opaque 404.

### UC-07 — MCP mutation

1. MCP client gửi payload cho preview tool.
2. Backend validate/tính impact và ký confirmation token.
3. Human review preview.
4. Client gọi confirm bằng exact payload, token và idempotency key.
5. Backend consume token, ghi transaction/account và lưu mutation result.

## 8. Phụ lục C — Inventory mô hình dữ liệu

| Collection/model | Dữ liệu chính | Ràng buộc/index đáng chú ý |
|---|---|---|
| `users` | identity, password hash, role, workspace, state | email unique theo repository policy |
| `passwordresettokens` | token hash, user, expiry, usedAt | raw token không persist |
| `workspaces` | workspace ID, owner user | workspaceId unique |
| `cardproducts` | canonical catalog | presetId unique/immutable; provider-active-sort index |
| `cardproductimages` | optional binary/cache metadata | presetId unique |
| `creditcards` | card snapshot + operational config | workspace list/owner indexes |
| `accounts` | real-money/credit accounts | workspace+name unique; creditCardId unique partial |
| `cardstatements` | period, due date, payment state | workspace+card+statementDate unique |
| `financialtransactions` | source-of-truth transaction + persisted impact | indexes theo workspace/date/account/category |
| `monthlycardcashbacks` | bank cashback per month | workspace+card+period unique |
| `cardfeepayments` | fee/fee-center record | workspace+card+paymentDate index |
| `financecategories` | category tree đơn giản | workspace+name unique |
| `financebudgets` | limit per month/category | workspace+month+category unique |
| `recurringexpenses` | monthly expense definition | workspace+active+nextDueDate index |
| `calendarsubscriptions` | token hash và access metadata | tokenHash unique, user/workspace index |
| `reminderdeliveries` | delivery lease/idempotency | workspace+statement+daysBefore unique |
| `mcpmutations` | idempotent mutation result | workspace+operation+key unique |
| `calendarnotes` | note theo ngày | repository upsert theo workspace+date; source không khai báo index |
| `authauditlogs` | auth/catalog audit | query trực tiếp, limit tối đa 100 |
| `banks`, `cardtypes` | legacy masterdata global | không scope workspace trong source hiện tại |

### 8.1 Quan hệ logic

```text
Workspace 1 --- N User
Workspace 1 --- N CreditCard 1 --- 0..1 CREDIT Account
CreditCard 1 --- N CardStatement 1 --- N FinancialTransaction
CreditCard 1 --- N MonthlyCardCashback
CreditCard 1 --- N CardFeePayment
User 1 --- N CalendarSubscription
CardStatement 1 --- N ReminderDelivery
```

MongoDB không enforce foreign key. Parent ownership/workspace phải được kiểm tra
trong service hoặc route trước mutation.

## 9. Phụ lục D — Inventory giao diện HTTP hiện có

Tất cả path dưới đây là path backend. Browser đi qua Next rewrite cho các path
đã khai báo trong `frontend/next.config.ts`.

| Nhóm | Method/path | Auth | Chức năng |
|---|---|---|---|
| Lifecycle | `GET /health`, `GET /ready` | Public | Liveness/readiness |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | Public/optional | Identity lifecycle |
| Auth | `GET /api/auth/me` | Session | Current session |
| Auth | `POST /api/auth/bootstrap-users` | Bootstrap token | Upsert configured users |
| Catalog | `GET /api/card-catalog/providers`, `GET /api/card-catalog/products`, `GET /api/card-catalog/products/:presetId` | Public | Active catalog read |
| Catalog admin | `GET/POST /api/admin/card-catalog/products` | Admin | List/create product |
| Catalog admin | `PATCH /api/admin/card-catalog/products/:presetId`, `PATCH /api/admin/card-catalog/providers/:providerCode` | Admin | Product/provider update |
| Profile/admin | `GET/PATCH /api/profile` | Session | Profile read/update |
| Profile/admin | `GET /api/admin/users`, `PATCH /api/admin/users/:id`, `GET /api/admin/audit-logs` | Admin | User/audit management |
| Workspace | `GET /api/workspace/owner`, `PUT /api/workspace/owner` | Session/Admin write | Workspace owner |
| Card | `GET /api/cards`, `POST /api/cards`, `GET /api/cards/:id`, `PUT /api/cards/:id`, `DELETE /api/cards/:id` | Session | Card CRUD |
| Card | `GET /api/cards/duplicates`, `POST /api/cards/duplicates` | Session | Detect/merge duplicate |
| Account | `GET /api/accounts`, `POST /api/accounts` | Session | Account list/create |
| Finance | `GET /api/financial-transactions`, `POST /api/financial-transactions` | Session | Transaction list/create |
| Finance | `GET /api/financial-reports/summary`, `GET /api/financial-reports/credit-statements` | Session | Financial reports |
| Finance | `GET /api/finance/categories`, `POST /api/finance/categories`, `POST /api/finance/categories/defaults` | Session | Category operations |
| Finance | `PUT /api/finance/budgets`, `GET /api/finance/budgets/status` | Session | Budget operations |
| Finance | `GET /api/finance/recurring-expenses`, `POST /api/finance/recurring-expenses` | Session | Recurring expense |
| Statement | `GET /api/card-statements` | Session | Batch statement list |
| Statement | `GET /api/cards/:id/statements`, `GET /api/cards/:id/statements/:statementId` | Session | Card statement read |
| Statement | `PATCH /api/cards/:id/statements/:statementId/payment` | Session | State/payment mutation |
| Statement | `POST /api/cards/:id/statements/:statementId/calendar-email` | Session | One-off calendar email |
| Cashback | `GET /api/cards/:cardId/monthly-cashbacks?year=YYYY` | Session | Year list |
| Cashback | `PUT/DELETE /api/cards/:cardId/monthly-cashbacks/:period` | Session | Upsert/delete month |
| Fee | `GET/POST /api/cards/:cardId/fee-payments` | Session | Card fee list/create |
| Fee | `PUT/DELETE /api/cards/:cardId/fee-payments/:feePaymentId` | Session | Card fee update/delete |
| Fee Center | `GET/POST /api/fee-center`, `PUT/DELETE /api/fee-center/:id` | Session | Central categorized fee ledger |
| Calendar | `GET /api/calendar-subscriptions`, `POST /api/calendar-subscriptions`, `DELETE /api/calendar-subscriptions/:id` | Session | Subscription management |
| Calendar | `GET /api/calendar-subscriptions/feed/:token.ics` | Token | Private feed |
| Projection | `GET /api/cash-flow/monthly`, `GET /api/notifications` | Session | Read projections |
| Notes | `GET/POST /api/notes` | Session | List/upsert/delete-empty |
| Legacy | `GET/POST /api/banks`, `PUT/DELETE /api/banks/:id` | Session/Admin write | Bank masterdata |
| Legacy | `GET/POST /api/cardtypes`, `PUT/DELETE /api/cardtypes/:id` | Session/Admin write | Card type masterdata |
| MCP | `POST/GET/DELETE /mcp` | Bearer | Streamable HTTP session |
| Docs | `GET /docs`, `GET /docs/json` | Public khi enabled | Swagger UI/OpenAPI |

### 9.1 Response contract

- Financial/new APIs chủ yếu dùng `{ "data": ... }`.
- Auth/profile giữ compatibility `{ "user": ... }`; admin users dùng
  `{ "users": [...] }`; card list/card CRUD và legacy masterdata còn trả raw
  object/array ở một số endpoint.
- Lỗi chuẩn dùng:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Dữ liệu không hợp lệ.",
    "fields": { "field": "Mô tả lỗi." }
  }
}
```

## 10. Phụ lục E — Inventory chức năng UI hiện tại

| UI route | Chức năng thực tế | Mức hoàn thiện |
|---|---|---|
| `/` | Redirect `/dashboard` | Hoàn chỉnh |
| `/register`, `/login`, `/forgot-password` | Auth forms | Có API integration; forgot password chưa gửi email thực tế |
| `/dashboard` | KPI tháng và sáu transaction gần nhất | Read-only |
| `/cards` | Card dashboard, add/delete, duplicate merge, statement actions, monthly cash flow | Có mutation; payment phụ thuộc repayment account fallback |
| `/cards/[id]` | Redirect về `/cards` | Card detail/editor legacy đã loại bỏ |
| `/accounts` | Group và hiển thị balance/debt | Read-only; chưa có create UI |
| `/transactions` | List/filter transaction | Modal “AI” chỉ preview text cục bộ, chưa gọi MCP/REST để ghi |
| `/budgets` | Đọc trạng thái budget tháng hiện tại | Read-only; DTO UI/backend đang lệch |
| `/reports` | Summary tháng hiện tại và category breakdown | Read-only; chưa có filter/export thật |
| `/analytics` | Redirect `/reports` | Compatibility |
| `/payments` | List/filter statement, đánh dấu paid | Có mutation; client chưa chọn repayment account |
| `/cashback` | Chọn card, CRUD monthly bank cashback | Có API integration nhưng không nằm trong main navigation |
| `/fees` | CRUD categorized Fee Center | Có API integration |
| `/notifications` | Read statement notification projection | Read-only |
| `/profile` | Sửa display name, quản lý calendar subscription | Có mutation |
| `/admin/users` | Admin list/update user | Có mutation |
| `/admin/card-catalog` | Admin list/update product | UI không cung cấp toàn bộ create/provider operation |
| `/masterdata/banks`, `/masterdata/cardtypes` | Legacy CRUD | Admin mutation |

Chưa có UI tích hợp cho: tạo account, REST create financial transaction, category
create/default seed, budget upsert, recurring expense, workspace owner, audit log,
one-off calendar email và Swagger/MCP management.

## 11. Phụ lục F — Giao diện ngoài và cấu hình runtime

### 11.1 Biến môi trường

| Nhóm | Biến | Yêu cầu |
|---|---|---|
| Backend bắt buộc | `MONGODB_URI`, `AUTH_SECRET` | Auth secret tối thiểu 32 ký tự |
| Auth session | `AUTH_SESSION_MAX_AGE_MS` | Optional; absolute session lifetime, mặc định 8 giờ, giới hạn 1 phút–30 ngày |
| Backend listener | `BACKEND_HOST`, `BACKEND_PORT`, `LOG_LEVEL`, `SHUTDOWN_TIMEOUT_MS` | Có default an toàn trong config |
| Frontend proxy | `BACKEND_INTERNAL_URL` | Default local hoặc `http://backend:3001` ở production |
| Auth bootstrap | `AUTH_BOOTSTRAP_TOKEN`, `AUTH_USERS_JSON` | Optional, phải có cả dữ liệu và token để dùng |
| Reset dev | `PASSWORD_RESET_RETURN_TOKEN` | Chỉ nên bật trong môi trường kiểm soát |
| SMTP | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_ADDRESS`, optional `SMTP_PORT`, `SMTP_SECURE` | Cần cho email/reminder |
| Reminder | `REMINDER_SCAN_INTERVAL_MS`, `REMINDER_CLAIM_TIMEOUT_MS` | Default 60s và 300s |
| Payment | `FINANCE_DEFAULT_REPAYMENT_ACCOUNT_ID` | Fallback hiện cần cho UI payment |
| MCP | `MCP_HTTP_TOKEN`, `MCP_WORKSPACE_ID`, `MCP_USER_ID`, optional `MCP_PREVIEW_SECRET` | Khi token bật endpoint, `MCP_PREVIEW_SECRET` phải explicit và tối thiểu 32 ký tự; không fallback `AUTH_SECRET` |
| Catalog | `CARD_CATALOG_PATH` | Backend image dùng `/app/catalog/card-presets.json` |
| Docs | `API_DOCS_ENABLED` | `false` để tắt Swagger |

### 11.2 SMTP

- Hỗ trợ `SMTP_HOST=host:port`, nhưng `SMTP_PORT` riêng được ưu tiên.
- Port mặc định 587; secure mặc định true cho port 465, nếu không là false.
- Connection/greeting/socket timeout lần lượt 10s/10s/20s.
- SMTP credential chỉ tồn tại ở backend runtime, không được đưa vào
  `NEXT_PUBLIC_*` hoặc image build argument.

### 11.3 Build và delivery

- Node.js 22, Next.js 16/React 19, Fastify 5, TypeScript, MongoDB/Mongoose.
- Jenkins shared pipeline validate hai source directory, chạy Sonar/Trivy/CodeQL,
  build hai image và cập nhật GitOps; Jenkins không deploy trực tiếp.
- Backend và frontend image chạy bằng non-root user.

## 12. Phụ lục G — Yêu cầu phi chức năng và acceptance baseline

### 12.1 Security và privacy

| ID | Yêu cầu |
|---|---|
| NFR-SEC-01 | Không lưu hoặc log PAN, CVV, OTP, raw password, auth secret, Mongo URI, session cookie, calendar token hoặc reset token. |
| NFR-SEC-02 | Private endpoint phải authenticate và scope workspace; admin endpoint phải kiểm tra role ở backend. |
| NFR-SEC-03 | Browser mutation cross-site phải bị chặn bằng `Origin`/Fetch Metadata policy; không bật credential wildcard CORS. |
| NFR-SEC-04 | Calendar/MCP token phải được so sánh hoặc lookup theo cách không lộ token; raw token không xuất hiện trong log. |
| NFR-SEC-05 | Input ObjectId, date, amount, enum, text length phải được validate tại boundary/service trước mutation. |

### 12.2 Reliability và data integrity

| ID | Yêu cầu |
|---|---|
| NFR-REL-01 | Statement, monthly cashback, MCP mutation và reminder delivery phải có unique/idempotency guard như mô hình dữ liệu. |
| NFR-REL-02 | Multi-document payment/import phải atomic bằng MongoDB transaction. |
| NFR-REL-03 | Backend phải graceful shutdown; readiness chỉ healthy sau khi Mongo connected. |
| NFR-REL-04 | Import/migration CLI phải dry-run hoặc explicit apply, có backup/reconciliation trước mutation production. |

### 12.3 Performance và scalability

| ID | Yêu cầu |
|---|---|
| NFR-PERF-01 | Query list/report phải dùng index theo workspace/date/account/category/card khi có. |
| NFR-PERF-02 | Batch dashboard/statement phải tránh N+1; scheduler phải batch statement total và user lookup. |
| NFR-PERF-03 | API list cần pagination/cursor trước khi vượt quy mô workspace nhỏ; source hiện mới giới hạn notification/audit/MCP upcoming. |
| NFR-PERF-04 | Backend stateless ngoài MongoDB và in-memory MCP transport map; reminder lease phải chống gửi trùng giữa replica. |

### 12.4 Accessibility và localization

| ID | Yêu cầu |
|---|---|
| NFR-A11Y-01 | UI mặc định tiếng Việt, HTML `lang=vi`, hỗ trợ desktop/mobile và keyboard/focus cho modal/picker. |
| NFR-A11Y-02 | Error/status quan trọng phải có `role=alert`/`status`; màu không được là tín hiệu duy nhất. |
| NFR-A11Y-03 | VND hiển thị bằng locale `vi-VN`; business date lưu canonical ISO. |

### 12.5 Verification matrix

| Phạm vi | Bằng chứng hiện có |
|---|---|
| Shared error contract | `shared/tests/contracts.test.js` |
| Auth/config/browser security/health | `backend/tests/auth.test.ts`, `config.test.ts`, `browser-security.test.ts`, `health.test.ts` |
| Financial formulas | `backend/tests/financial-domain.test.ts` |
| Statement period/summary | `backend/tests/transactions.test.ts`, `frontend/tests/transactionStatement.test.mjs` |
| Card/catalog | `backend/tests/cards.test.ts`, `catalog*.test.ts`, Playwright catalog specs |
| Cashback/fee | Backend và frontend `monthly-card-cashback`/`monthlyCashbacks`, `card-fee-payments`/`cardFeePayments` tests |
| Calendar/reminder/mail | `statement-calendar*`, `calendar-subscription`, `payment-reminder`, `mail-service` tests |
| MCP confirmation | `mcp-schema.test.ts`, `mcp-preview.test.ts` |
| Split runtime | `frontend/tests/e2e/split-runtime.spec.ts` |

Validation chuẩn của repository:

```bash
cd shared && npm ci && npm test
cd ../backend && npm ci && npm run validate
cd ../frontend && npm ci && npm run typecheck && npm run lint && npm test && npm run build
```

## 13. Khoảng trống và rủi ro phát hiện từ source

| ID | Mức độ | Hiện trạng và tác động |
|---|---|---|
| GAP-SEC-01 | Đã xử lý một phần | Session hiện kiểm tra `issuedAt` theo absolute expiry (`AUTH_SESSION_MAX_AGE_MS`, mặc định 8 giờ); browser/MCP adapter, private reads `/api/auth/me`, `/api/profile`, `/api/workspace/owner`, `/api/notes` và Notes POST revalidate user active/locked/workspace. Còn thiếu session version/revocation tức thời và các private mutation/direct-model route khác chưa đi qua đầy đủ application service context. |
| GAP-SEC-02 | Cao | Public register chấp nhận `workspaceId` do client truyền. Người biết workspace ID có thể tự đăng ký vào workspace đó nếu không có policy bổ sung ngoài source. |
| GAP-DATA-01 | Cao | Delete card và duplicate merge không cascade/relink account, statement, transaction, cashback, fee, reminder. Có thể tạo orphan hoặc xóa source trong khi dữ liệu tài chính vẫn tham chiếu source card. |
| GAP-PAY-01 | Cao | Frontend payment chỉ gửi `action`, không cho chọn `repaymentAccountId`; payment có amount sẽ lỗi nếu thiếu `FINANCE_DEFAULT_REPAYMENT_ACCOUNT_ID`. |
| GAP-PAY-02 | Cao | Payment route coi mọi action khác `REOPEN`/`CLOSED` là `PAID`; request thiếu/sai action có thể đánh dấu paid. `REOPEN` không reverse/xóa `STATEMENT_PAYMENT`, nên cashflow/debt có thể không phục hồi. |
| GAP-STM-01 | Đã xử lý một phần | Statement Read v1, notification, private calendar feed, payment-reminder, one-off calendar-email và `creditStatements` report projections đã dùng shared `StatementDto`, `StatementQueryService` và persisted `creditDebt`/impact cho REST GET, MCP summary/upcoming, Frontend read, notifications, ICS, scheduled/one-off email và credit report; calendar feed vẫn giữ `lastAccessedAt` write hiện hữu nhưng không đổi schema; payment PATCH/state transition vẫn còn legacy mutation/formula cần slice riêng. |
| GAP-REP-01 | Đã xử lý một phần | `FinancialReportService` và shared `FinancialReportDto` đã đọc ledger transaction, `MonthlyCardCashbackModel` và `CardFeePaymentModel` theo workspace/range; REST, MCP `get_personal_finance_summary`, frontend client/report page dùng cùng DTO. Card fee history/Fee Center GET, monthly cashback GET và monthly cash-flow GET dùng shared read schemas + query services; fee/cashback REST mutations đã được đưa vào `FeeCommandService`/`MonthlyCashbackCommandService` với trusted context, nhưng vẫn là compatibility commands chưa có generic preview-confirm/idempotency/audit và chưa có MCP mutation. Cash-flow vẫn giữ extraction formula và chưa follow `reimbursementForTransactionId` về expense CREDIT. Còn owner/card/year/month filters, orphan cleanup, semantic cash-flow repair và legacy fee-category migration cần slice riêng; vì vậy chưa đóng hoàn toàn FR-08. |
| GAP-OPS-01 | Cao | `server.ts` gọi `syncCatalogFromFile()` với apply=true mỗi lần start, trái với mô tả dry-run/operator-controlled trong `backend/README.md`; admin catalog changes trùng baseline có thể bị ghi đè khi restart. |
| GAP-MCP-01 | Đã xử lý một phần | Preview token v1 hiện dùng dedicated `MCP_PREVIEW_SECRET`, TTL 300 giây, HMAC domain separation và bind operation, canonical payload hash, workspace/user/channel; token không chứa raw payload. Token vẫn stateless/replayable tới expiry, chưa bind resource version, chưa có one-time human approval, `McpMutationModel` vẫn chỉ là idempotency receipt chứ chưa phải append-only audit; cùng preview với key khác vẫn có thể lặp effect. |
| GAP-ACC-01 | Đã xử lý một phần | `AccountService.create` đã fail-closed với malformed/missing/inactive/cross-workspace `creditCardId` trước `AccountModel.create`, và giữ idempotency replay trước card lookup. Còn race card bị deactivate/delete sau read validation trước write; xử lý transaction/locking thuộc lifecycle decision riêng. |
| GAP-REP-02 | Trung bình | `netAssets`/`creditDebtBalance` trong range report dùng opening balance cộng transaction chỉ trong range. Dashboard gọi range tháng nên KPI “balance” có thể bỏ qua giao dịch lịch sử trước tháng. |
| GAP-UI-01 | Đã xử lý | Budget status dùng shared `BudgetStatusDto` (`limitAmount`, `usedAmount`, `remainingAmount`, `usagePercent`, `status`) ở backend serializer, frontend runtime parser và Budget UI; contract tests nằm ở `cc4d333`. Budget write input/month validation vẫn là AS-IS riêng. |
| GAP-UI-02 | Đã xử lý một phần | Reports UI vẫn hiển thị tháng hiện tại; Cards “Xuất JSON” đã gọi `/api/financial-reports/summary` canonical thay vì mở HTML, và không còn gửi owner filter giả. Owner/card/year/month report filters cần contract slice riêng vì backend hiện chỉ nhận `from/to`; independent review yêu cầu chốt semantics balance, inactive/orphan card và zero-total matched cards trước khi mở. |
| GAP-UI-03 | Trung bình | Transaction “AI modal” chỉ hiển thị text preview cục bộ và đóng modal; chưa kết nối MCP hoặc REST mutation. Accounts/category/budget/recurring cũng thiếu write UI tương ứng. |
| GAP-AUTH-01 | Trung bình | Forgot-password tạo token nhưng không gọi mail service; production khi không bật return-token vẫn trả generic success mà không gửi hướng dẫn. |
| GAP-WEB-01 | Đã xử lý | Next middleware hiện guard các UI `/dashboard`, `/transactions`, `/accounts`, `/budgets`, `/reports`, `/payments`, `/notifications`, `/fees`, `/cashback`, `/analytics` và private finance APIs bằng session cookie; unauthenticated UI redirect về login, API trả 401. Calendar subscription `.ics` feed được giữ ngoài session middleware vì dùng token riêng và backend vẫn validate token. |
| GAP-API-01 | Đã xử lý một phần | REST manifest/runtime parity gate đã bao phủ route inventory và `x-mcp` dùng MCP manifest đang đăng ký; security metadata vẫn ở mức transport (`public/session/bearer`) và auth policy chi tiết cần refinement. |
| GAP-DOC-01 | Đã xử lý một phần | Smoke test, Cards JSON export và `docs/api.md` đã dùng route canonical `/api/financial-reports/summary` với shape `range/totals`; legacy `frontend/lib/api/reportsCore.mjs` đã xóa. `docs/requirements.md` còn một số target report/KPI mô tả rộng hơn runtime và cần contract decision riêng. |
| GAP-PERF-01 | Thấp-Trung bình | Hầu hết list API chưa pagination. Statement upcoming đã batch-load transactions/cards và giới hạn 1..50; MCP transport map vẫn phụ thuộc client close để giải phóng. |
| GAP-DATA-02 | Thấp-Trung bình | `calendarnotes` upsert theo workspace/date nhưng source không tạo unique index; concurrent upsert có thể sinh duplicate nếu database chưa có index ngoài code. |

## 14. Thứ tự ưu tiên đề xuất

1. Khóa boundary: session expiry/revalidation và policy join workspace.
2. Sửa payment state machine, bắt buộc action hợp lệ, chọn repayment account và
   định nghĩa reverse khi reopen.
3. Quyết định cascade/restrict/relink cho card delete và duplicate merge.
4. Chọn một source/report contract cho cashback và fee; loại bỏ lời mô tả UI
   không đúng với dữ liệu tính toán.
5. Loại compatibility formula sai semantics hoặc tách rõ legacy DTO khỏi
   Financial Domain.
6. Đưa startup catalog sync về policy operator-controlled hoặc cập nhật quyết
   định chính thức kèm rollback.
7. Xây command infrastructure dùng chung cho browser/MCP: preview state,
   one-time confirmation, idempotency reservation và audit riêng.
8. Đồng bộ UI DTO, report/export, OpenAPI, smoke test và tài liệu còn lại.

## 15. Tiêu chí hoàn tất cho thay đổi tương lai

Một thay đổi chức năng chỉ được coi là hoàn tất khi:

1. Route/service/model/UI và SRS dùng cùng một contract.
2. Mọi private read/write có test workspace isolation.
3. Financial formula hoặc state transition có unit/integration test tập trung.
4. Migration hoặc data rewrite có dry-run, backup, reconciliation và rollback.
5. API docs/browser client được cập nhật cùng backend route.
6. Chạy narrow validation phù hợp và ghi rõ những check chưa thể chạy.
