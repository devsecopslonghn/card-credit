# Feature/API/UI Audit — Card Credit

Ngày rà soát: **2026-08-18**  
Phạm vi: `backend/`, `frontend/`, `shared/`, `docs/SRS.md`,
`docs/requirements.md`, REST manifest, MCP manifest và test hiện có.

## 1. Kết luận ngắn

Source đã có kiến trúc API khá đầy đủ, nhưng **chưa thể coi là đúng end-to-end**.
Một số API backend và shared contract đúng, trong khi UI còn màn hình thiếu thao
tác hoặc hiển thị sai số liệu.

Các lỗi cần ưu tiên:

| Mức | Vấn đề | Ảnh hưởng |
|---|---|---|
| P0 | `AccountService.currentDebt` cộng `creditDebt` đã bao gồm payment rồi lại trừ payment lần hai | Trang `Tài khoản` có thể hiển thị thẻ còn nợ là `0`, trong khi statement ledger/MCP vẫn còn dư nợ |
| P0 | Màn hình thêm giao dịch bằng AI không gọi REST/MCP và không ghi transaction | Nút “+ Thêm giao dịch” cho cảm giác hoạt động nhưng thực tế không tạo dữ liệu |
| P0 | SRS yêu cầu sửa/xóa transaction nhưng REST/service hiện chỉ có list/create | Đã xử lý ở source: PATCH/DELETE + UI |
| P1 | Trang Payments tính tổng “Đã thanh toán” từ `outstandingAmount` | Kỳ đã thanh toán thường đóng góp `0` vào tổng “Đã thanh toán” |
| P1 | Fee Center UI chỉ create/delete, không có edit dù API PUT đã có | Không đáp ứng đầy đủ create/update/delete |
| P1 | Export report không giữ filter hiện tại; Reports page không có nút export | Vi phạm yêu cầu export đúng filter |
| P1 | Card detail bị redirect về `/cards` | Đã xử lý ở source: detail/update/reminder/statement/calendar UI |
| P1 | Cash-flow backend lấy transaction cashback làm `bankCashbackActual`, bỏ qua monthly cashback actual | Số liệu dòng tiền/benefit có thể sai nghĩa |
| P2 | Reports thiếu một số KPI có trong API và biểu đồ category dùng độ rộng cố định | Hiển thị chưa phản ánh đủ contract, biểu đồ không có tỷ lệ thực |

## 1.1. Trạng thái triển khai sau audit

Các finding trên đã được xử lý trong source checkout này:

- `currentDebt` chỉ lấy một lần từ persisted `creditDebt`; không trừ payment lần hai.
- Transactions có REST `POST/PATCH/DELETE` với idempotency guard và UI ghi/sửa/xóa thật; modal AI giả đã được bỏ khỏi flow.
- Payments tách `paidAmount` khỏi `outstandingAmount`.
- Fee Center có create/update/delete và phân biệt tổng OUT/IN.
- Card detail có operational/reminder settings, statement summary, payment và calendar email.
- Report export giữ filter hiện tại, bổ sung KPI và scale category bar theo dữ liệu.
- Cash-flow lấy fee ledger và monthly cashback `RECEIVED`; `netResult` tính trên tổng IN trừ tổng OUT.
- Statement list mặc định không nested transactions; detail endpoint mới đọc transactions.

Các mục còn là API-only theo chủ đích (account/category/note administration) không
phải blocker của luồng end-to-end tài chính hiện tại.

## 2. Cách đọc trạng thái

- **OK**: API, service, UI và test hiện có cùng semantics trong phạm vi đã rà.
- **API-only**: backend/MCP có chức năng, UI chưa expose hoặc chưa đủ thao tác.
- **PARTIAL**: có code nhưng thiếu một phần flow hoặc thiếu parity.
- **BUG**: code hiện tại có khả năng tạo kết quả sai.
- **GAP**: requirement yêu cầu nhưng chưa có implementation tương ứng.
- **RUNTIME-STALE**: source đã có thay đổi nhưng cluster chưa rollout image chứa source đó.

Evidence trong file này là source/test evidence. Đây không phải bằng chứng dữ
liệu live cho mọi workspace. Kubernetes hiện đang chạy image cũ
`84d5bb2a6f85`, vì vậy UI production có thể chưa giống source checkout này.

## 3. REST API inventory — 74 routes

Registry authoritative: `backend/src/rest-manifest.ts`. Route parity được kiểm
tra bởi `rest-runtime-inventory.test.ts` và `rest-manifest.test.ts`.

### Health, auth và session

| Method | Path | Auth | UI/consumer | Trạng thái |
|---|---|---|---|---|
| GET | `/health` | public | Kubernetes/liveness | OK |
| GET | `/ready` | public | Kubernetes/readiness | OK |
| POST | `/api/auth/login` | public | `/login` | OK |
| POST | `/api/auth/register` | public | `/register` | OK |
| GET | `/api/auth/me` | session | auth/session helpers | OK |
| POST | `/api/auth/logout` | public | logout button | OK |
| POST | `/api/auth/forgot-password` | public | `/forgot-password` | OK |
| POST | `/api/auth/reset-password` | public | reset flow | OK |
| POST | `/api/auth/bootstrap-users` | bearer | operator/bootstrap | API-only, guarded |

### Card, catalog và statement/payment

| Method | Path | Auth | UI/consumer | Trạng thái |
|---|---|---|---|---|
| GET | `/api/cards` | session | `/cards`, account/payment/cashback pages | OK |
| POST | `/api/cards` | session | `AddCardModal` | OK |
| GET | `/api/cards/{id}` | session | không có page detail thực | API-only |
| PUT | `/api/cards/{id}` | session | không có UI caller hiện tại | API-only/GAP UI |
| DELETE | `/api/cards/{id}` | session | `/cards` | OK về soft-retire; label UI đang gọi là xóa |
| GET | `/api/cards/duplicates` | session | `DuplicateResolver` | OK |
| POST | `/api/cards/duplicates` | session | `DuplicateResolver` | OK, cần tiếp tục giữ merge guard |
| GET | `/api/card-catalog/providers` | public | `ProviderPicker` | OK |
| GET | `/api/card-catalog/products` | public | `ProductPicker` | OK |
| GET | `/api/card-catalog/products/{presetId}` | public | catalog/card flow | OK |
| GET | `/api/card-statements` | session | cards/accounts/payments | OK nhưng default đọc toàn bộ statements và transactions |
| GET | `/api/cards/{id}/statements` | session | compatibility/card reads | API-only/GAP UI |
| GET | `/api/cards/{id}/statements/{statementId}` | session | detail/calendar service | API-only/GAP UI |
| POST | `/api/cards/{id}/statements/{statementId}/payment/preview` | session | dashboard/payments | OK |
| PATCH | `/api/cards/{id}/statements/{statementId}/payment` | session | dashboard/payments | OK, preview + idempotency |
| POST | `/api/cards/{id}/statements/{statementId}/calendar-email` | session | backend contract; UI detail đang bị redirect | PARTIAL |
| GET | `/api/cards/{cardId}/monthly-cashbacks` | session | `/cashback` | OK |
| PUT | `/api/cards/{cardId}/monthly-cashbacks/{period}` | session | `/cashback` | OK |
| DELETE | `/api/cards/{cardId}/monthly-cashbacks/{period}` | session | `/cashback` | OK |

### Financial ledger, account và report

| Method | Path | Auth | UI/consumer | Trạng thái |
|---|---|---|---|---|
| GET | `/api/accounts` | session | `/accounts`, payment account picker | BUG: current debt có thể bị trừ payment hai lần |
| POST | `/api/accounts` | session | MCP/API, chưa có UI form | API-only |
| GET | `/api/financial-transactions` | session | `/transactions`, dashboard | OK về read |
| POST | `/api/financial-transactions` | session | `/transactions` | OK |
| PATCH | `/api/financial-transactions/{id}` | session | `/transactions` | OK |
| DELETE | `/api/financial-transactions/{id}` | session | `/transactions` | OK |
| GET | `/api/financial-reports/summary` | session | `/reports`, cards export, MCP summary | OK về canonical ledger |
| GET | `/api/cash-flow/monthly` | session | cards dashboard | BUG semantic: cashback/fee/net chưa khớp source authoritative |
| GET | `/api/notes` | session | chưa có UI page | API-only theo SRS |
| POST | `/api/notes` | session | chưa có UI page | API-only theo SRS |
| GET | `/api/notifications` | session | `/notifications` | OK read |

### Planning, fee và workspace

| Method | Path | Auth | UI/consumer | Trạng thái |
|---|---|---|---|---|
| GET | `/api/finance/categories` | session | budgets/recurring | OK |
| POST | `/api/finance/categories` | session | chưa có UI create | API-only |
| PUT | `/api/finance/budgets` | session | `/budgets` | OK |
| GET | `/api/finance/budgets/status` | session | `/budgets` | OK |
| GET | `/api/finance/recurring-expenses` | session | `/recurring` | OK |
| POST | `/api/finance/recurring-expenses` | session | `/recurring` | OK |
| PUT | `/api/finance/recurring-expenses/{id}` | session | `/recurring` | OK |
| DELETE | `/api/finance/recurring-expenses/{id}` | session | `/recurring` | OK, deactivate semantics |
| GET | `/api/fee-center` | session | `/fees` | OK read |
| POST | `/api/fee-center` | session | `/fees` | OK |
| PUT | `/api/fee-center/{id}` | session | client có nhưng page không có edit action | API-only/GAP UI |
| DELETE | `/api/fee-center/{id}` | session | `/fees` | OK |
| GET | `/api/workspace/owner` | session | scheduler/admin contract | API-only |
| PUT | `/api/workspace/owner` | session | admin/service contract | API-only |

### Profile, calendar, admin và masterdata

| Method | Path | Auth | UI/consumer | Trạng thái |
|---|---|---|---|---|
| GET | `/api/profile` | session | profile/navigation/admin | OK |
| PATCH | `/api/profile` | session | `/profile` | OK |
| GET | `/api/calendar-subscriptions` | session | profile calendar settings | OK |
| POST | `/api/calendar-subscriptions` | session | profile calendar settings | OK, raw URL one-time |
| DELETE | `/api/calendar-subscriptions/{id}` | session | profile calendar settings | OK |
| GET | `/api/calendar-subscriptions/feed/{token}.ics` | calendar-token | Apple Calendar | OK tokenized read-only |
| GET | `/api/admin/audit-logs` | admin | API/admin contract | API-only |
| GET | `/api/admin/card-catalog/products` | admin | `/admin/card-catalog` | OK read |
| POST | `/api/admin/card-catalog/products` | admin | no create form | API-only/GAP UI |
| PATCH | `/api/admin/card-catalog/products/{presetId}` | admin | image URL only | PARTIAL UI |
| PATCH | `/api/admin/card-catalog/providers/{providerCode}` | admin | no provider UI | API-only/GAP UI |
| GET | `/api/admin/users` | admin | `/admin/users` | OK |
| PATCH | `/api/admin/users/{id}` | admin | `/admin/users` | OK |
| GET | `/api/banks` | session | masterdata banks | OK, command enforces admin |
| POST | `/api/banks` | session | masterdata banks | OK, command enforces admin |
| PUT | `/api/banks/{id}` | session | masterdata banks | OK, command enforces admin |
| DELETE | `/api/banks/{id}` | session | masterdata banks | OK, command enforces admin |
| GET | `/api/cardtypes` | session | masterdata cardtypes | OK |
| POST | `/api/cardtypes` | session | masterdata cardtypes | OK, command enforces admin |
| PUT | `/api/cardtypes/{id}` | session | masterdata cardtypes | OK |
| DELETE | `/api/cardtypes/{id}` | session | masterdata cardtypes | OK |

## 4. MCP inventory — 17 tools

MCP registry: `backend/src/mcp/manifest.ts`. Browser UI không được gọi `/mcp`;
MCP là adapter riêng dùng cùng application service.

| Tool | Kind | Mục đích | Trạng thái |
|---|---|---|---|
| `get_statement_summary` | query | Đọc summary một statement | OK |
| `list_transactions` | query | Đọc financial transactions bounded | OK |
| `get_monthly_cash_flow` | query | Đọc cash-flow theo tháng/card | PARTIAL semantic audit |
| `compare_cards` | query | So sánh card | OK |
| `list_duplicate_cards` | query | Đọc nhóm duplicate | OK |
| `list_card_fee_payments` | query | Đọc fee theo card | OK, dùng shared query service |
| `list_fee_center` | query | Đọc Fee Center | OK |
| `list_monthly_cashbacks` | query | Đọc cashback theo card/năm | OK |
| `list_upcoming_statements` | query | Đọc kỳ chưa trả | OK |
| `get_personal_finance_summary` | query | Summary + `creditDebtLedger` đầy đủ, gồm PAID | OK canonical |
| `preview_import_financial_transaction` | preview | Preview batch transaction | API/MCP-only |
| `confirm_import_financial_transaction` | confirm | Ghi batch sau human confirmation | API/MCP-only |
| `list_accounts` | query | Đọc account/balance | BUG nếu dùng cùng currentDebt path |
| `preview_create_account` | preview | Preview tạo account | API/MCP-only |
| `confirm_create_account` | confirm | Tạo account idempotent | API/MCP-only |
| `preview_pay_statement` | preview | Preview payment | OK |
| `confirm_pay_statement` | confirm | Execute payment | OK |

## 5. UI route/functionality inventory

| UI route | Chức năng hiển thị/thao tác | API chính | Đánh giá |
|---|---|---|---|
| `/login`, `/register`, `/forgot-password` | Auth/session/reset | auth APIs | OK theo tests |
| `/dashboard` | KPI tháng, giao dịch gần đây | summary + transactions | OK cơ bản; chưa có writer transaction thật |
| `/cards` | Card list, owner filter, debt ledger, due payment, duplicate, cash-flow | cards/statements/payment/cash-flow | PARTIAL; detail/update/reminder thiếu |
| `/cards/{id}` | Được khai báo như detail route | không gọi API, redirect `/cards` | GAP rõ ràng |
| `/accounts` | Tiền thật, credit accounts, debt ledger | accounts/cards/statements | BUG currentDebt discrepancy; tải statements không bounded |
| `/transactions` | List/filter transaction | GET transactions | PARTIAL; add button là modal giả; không edit/delete |
| `/payments` | Lọc kỳ, tổng hợp, đánh dấu PAID | statements/accounts/payment | BUG tổng “Đã thanh toán” |
| `/reports` | Date/year/month/card/owner filters, KPI, category | summary/cards | PARTIAL; thiếu export, KPI và chart semantics |
| `/budgets` | Budget upsert/status | categories/budget | OK cơ bản; nhập `categoryId` bằng text/name dễ nhầm ID |
| `/recurring` | Create/update/deactivate schedule | recurring/accounts/categories | OK; hiển thị đúng là schedule-only |
| `/cashback` | Monthly cashback CRUD | cards/monthly-cashbacks | OK |
| `/fees` | Fee Center create/delete/list | fee-center/cards | PARTIAL; không edit, total cộng cả IN records |
| `/notifications` | Notification list | notifications | OK read-only |
| `/profile` | Profile + calendar subscription | profile/calendar | OK cơ bản |
| `/admin/users` | Admin users update | profile/admin users | OK |
| `/admin/card-catalog` | List catalog, update image URL | admin catalog | PARTIAL; thiếu product/provider CRUD UI |
| `/masterdata/banks` | CRUD bank | banks | OK functional, mutation chưa gửi idempotency key |
| `/masterdata/cardtypes` | CRUD card type | cardtypes | OK functional, mutation chưa gửi idempotency key |
| `/analytics` | Redirect alias về reports | không riêng | DECISION/alias, không phải feature độc lập |

## 6. Findings chi tiết có bằng chứng

### F-01 — Credit account balance bị trừ payment hai lần — P0/BUG

`FinancialTransaction` đã quy ước `creditDebt` của
`STATEMENT_PAYMENT` là số âm. `AccountService.list()` đã cộng toàn bộ
`totals.creditDebt` ở dòng `backend/src/services/account-service.ts:38`, sau đó
lại trừ `paidByCreditAccount` ở dòng `:59`.

```text
currentDebt = openingBalance + SUM(creditDebt) - SUM(statement payment amount)
```

Đúng ra phải chọn một trong hai nguồn:

```text
currentDebt = openingBalance + SUM(creditDebt)
```

hoặc tính từ gross statement/payment ledger nhưng không được trừ payment lần
hai. Đây là nguyên nhân phù hợp với hiện tượng UI `Max Card = 0` trong khi MCP
`creditDebtLedger` còn `outstandingDebt`.

### F-02 — Payments “Đã thanh toán” hiển thị sai — P1/BUG

`frontend/app/payments/page.tsx:64-68` đặt `amount` bằng
`row.summary.outstandingAmount`. Sau đó dòng `:81` cộng chính `amount` cho
những row `PAID`. Kỳ đã thanh toán có `outstandingAmount = 0`, nên tổng “Đã
thanh toán” bị thành 0.

UI cần tách rõ:

```text
gross = summary.statementAmount
paid = summary.paymentAmount
outstanding = summary.outstandingAmount
```

### F-03 — Thêm giao dịch bằng AI là UI giả — P0/GAP (đã xử lý)

Audit ban đầu ghi nhận `frontend/app/transactions/page.tsx` chỉ mở
`AiTransactionModal`; component giả đã được xóa. Transactions page hiện dùng
form dữ liệu chuẩn và gọi canonical REST command với idempotency key.

Browser vẫn không gọi `/mcp` theo architecture contract; parser giả đã được
loại bỏ và UI chỉ ghi các field đã xác nhận:

1. form tạo/sửa gọi REST canonical command;
2. backend vẫn chặn `STATEMENT_PAYMENT`/`TRANSFER` khỏi transaction đơn;
3. payment command riêng giữ preview/confirm/CAS như trước.

### F-04 — Transaction edit/delete chưa có — P0/GAP (đã xử lý)

`docs/requirements.md` yêu cầu user tạo, sửa và xóa transaction. Runtime
manifest chỉ có:

```text
GET    /api/financial-transactions
POST   /api/financial-transactions
PATCH  /api/financial-transactions/{id}
DELETE /api/financial-transactions/{id}
```

Source hiện có `PATCH/DELETE`, service command có idempotency/audit guard và UI
có nút Sửa/Xóa. `statementId` và reimbursement source là immutable khi sửa.

### F-05 — Card detail và operational settings không tới được — P1/GAP UI (đã xử lý)

Audit cũ ghi nhận `frontend/app/cards/[id]/page.tsx` luôn redirect. Source hiện
Có UI detail và gọi `GET/PUT /api/cards/{id}`, statement detail và calendar-email
 cho update card configuration, reminder settings, xem transaction trong statement
 và gửi calendar email.

user có thể dùng các chức năng này từ UI.

### F-06 — Fee Center không có update UI — P1/GAP UI (đã xử lý)

`frontend/app/fees/page.tsx` hiện có state edit, nút “Sửa” và đường gọi `PUT` với
`id`; người dùng có thể thêm, sửa và xóa.

Ngoài ra `total` của page cộng cả `BANK_CASHBACK` và `PARTNER_REFUND`, nhưng label
lại là “Tổng phí đã nhập”. Hai category này là dòng IN và report cố ý không tính
chúng vào `totalPaidCardFees`; label UI cần đổi hoặc tách total OUT/IN.

### F-07 — Export không giữ filter — P1/BUG UI (đã xử lý)

Cards export giữ `selectedOwner`; Reports có nút JSON export dùng đúng bộ lọc
date/year/month/card/owner hiện tại.

### F-08 — Cash-flow không cùng semantics với tên field — P1/BUG (đã xử lý)

`backend/src/services/cash-flow-query-service.ts:43-56` hiện:

- `bankCashbackActual` cộng `transaction.cashbackReceived`, không đọc
  `MonthlyCardCashback.actualAmount` với status `RECEIVED`;
- `actualFees` không trừ `refundReceived` theo công thức persisted impact;
- `netResult` chỉ là `partnerReturns - statementPayments`, không phản ánh
  actual fee và bank cashback.

Nếu đây là cash-flow theo card/payment thì phải đổi tên field cho đúng. Nếu là
Cash-flow hiện lấy fee ledger và monthly cashback `RECEIVED`, không dùng
`transaction.cashbackReceived` làm bank cashback; regression fixture đã cập nhật.

### F-09 — Report UI chưa hiển thị đủ contract — P2/PARTIAL (đã xử lý)

Backend trả các KPI:
`monthlyBankCashbackExpected`, `monthlyBankCashbackActual`,
`monthlyBankCashbackRejected`, `totalPaidCardFees`, `actualNetBenefit`.
Reports page hiện hiển thị expected, rejected và paid card fees thành metric riêng.

Category bar được scale theo giá trị lớn nhất trong bộ lọc hiện tại.

### F-10 — Read all statements đang kéo cả transactions — P1/PERF

Các page `/cards`, `/accounts`, `/payments` dùng
`fetchAllCardStatements()`, gọi `/api/card-statements` không truyền pagination.
Route hiện áp dụng `limit=100` và `includeTransactions: false`; statement detail
mới lấy transactions. Summary vẫn đọc ledger một lần để tính đúng số tiền, nhưng
không nhúng toàn bộ giao dịch vào response list.

Nên dùng page/batch bounded với `includeTransactions: false`; statement detail
mới lấy transactions.

## 7. Những phần hiện đang đúng theo source/test

- `creditDebtLedger` là projection canonical và giữ row PAID, phân biệt gross,
  paid và outstanding ở backend/service/shared contract.
- Dashboard debt ledger hiển thị đủ các kỳ đã thanh toán và lọc “cần trả” riêng
  theo outstanding.
- Statement payment đã có preview, confirmation, idempotency key, version/CAS
  và audit/command guard tests.
- Monthly cashback có CRUD theo card/tháng, unique semantics và status
  `PENDING/RECEIVED/REJECTED`.
- Recurring expense hiện hiển thị đúng là schedule-only, không tự ghi financial
  transaction.
- Calendar subscription không lộ raw token lần hai; feed là read-only.
- Workspace scope, trusted context và admin checks có test coverage trong
  backend.
- REST manifest/runtime parity và MCP manifest inventory có regression tests.

## 8. Thứ tự xử lý đề xuất

### Phase 1 — Chặn sai số liệu và chức năng giả

1. Sửa `AccountService.currentDebt`; thêm regression fixture có expense + partial
   payment để đối chiếu `accounts.currentDebt` với `creditDebtLedger`.
2. Sửa payment totals dùng `statementAmount/paymentAmount/outstandingAmount`.
3. Ẩn hoặc thay thế AI transaction modal cho tới khi có browser preview/confirm
   adapter thật.
4. Chốt contract transaction edit/delete; nếu requirement vẫn giữ thì implement
   state transition/preview/idempotency/audit đầy đủ.

### Phase 2 — Khép UI parity

1. Implement card detail/update/reminder settings và statement detail.
2. Bổ sung edit Fee Center và tách tổng OUT/IN.
3. Thêm export trên Reports page, truyền đúng `from/to/year/month/cardId/owner`.
4. Hiển thị đủ report KPI và sửa category chart theo tỷ lệ.

### Phase 3 — Sửa semantics/performance

1. Chốt semantics cash-flow với `MonthlyCardCashback` và persisted impact.
2. Bounded statement loading, summary-only reads và detail-only transactions.
3. Bổ sung UI account/category/note nếu các capability này vẫn là user-facing
   requirement.

## 9. Verification cần chạy sau khi sửa

```bash
cd shared && npm run validate
cd ../frontend && npm run typecheck && npm run lint && npm run test:all && npm run build
cd ../backend && npm run validate
```

Không claim runtime đã sửa cho tới khi image mới được build/publish và chart
được rollout. Cluster hiện vẫn cần kiểm tra lại bằng:

```bash
kubectl config current-context
kubectl -n card-credit get deploy card-credit-backend card-credit-frontend \
  -o custom-columns='NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image,READY:.status.readyReplicas'
```
