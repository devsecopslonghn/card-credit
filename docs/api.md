# API design — Card Credit

## 1. API conventions

- Base path: `/api`.
- Browser gọi relative URL; frontend proxy/rewrite tới Fastify.
- JSON request/response, UTF-8.
- Date: `YYYY-MM-DD`; month: `YYYY-MM`; amount: safe integer VND; rate:
  integer basis points (`10000 = 100%`).
- Auth được xác định bằng session cookie hoặc private calendar token; không nhận
  `userId`, `role`, `workspaceId` từ client để quyết định scope.
- `Content-Type: application/json` cho mutation; mutation same-origin cần Origin/
  Fetch Metadata hợp lệ.
- Query list/report cần giới hạn page/limit khi contract mở rộng; limit audit tối
  đa 100.

## 2. Response envelope

### Success

Resource response:

```json
{ "data": { "id": "..." } }
```

List response:

```json
{ "data": [], "meta": { "limit": 50, "nextCursor": null } }
```

Auth/profile compatibility hiện tại dùng `{ "user": {...} }`, còn một số admin
endpoint dùng `{ "users": [...] }`. Feature mới nên dùng `data`; migration
contract không được phá vỡ client hiện tại nếu chưa có version bump.

### Error

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Dữ liệu không hợp lệ.",
    "fields": { "amount": "Số tiền phải là số nguyên VND lớn hơn 0." }
  }
}
```

HTTP mapping: `400` invalid input, `401` unauthenticated, `403` forbidden,
`404` resource absent trong scope, `409` conflict/state/idempotency,
`422` business rule nếu cần phân biệt, `429` rate limit, `500` unexpected.
Không trả stack trace, Mongo URI, secret hoặc existence-sensitive detail.

## 3. Authentication endpoints

| Method/path | Auth | Request | Response |
|---|---|---|---|
| `POST /auth/register` | Public | `{email,password,displayName?,workspaceId?}` | `201 {user}` + Set-Cookie; first user policy có thể là admin. |
| `POST /auth/login` | Public | `{email,password}` | `{user}` + Set-Cookie. |
| `GET /auth/me` | Session | none | `{user}`. |
| `POST /auth/logout` | Optional session | none | `{ok:true}` + cleared cookie. |
| `POST /auth/forgot-password` | Public | `{email}` | Generic `{ok:true,message}`. |
| `POST /auth/reset-password` | Public token | `{token,password}` | `{user}` + new session. |
| `POST /auth/bootstrap-users` | Bootstrap token | configured user payload | Summary; token/header never echoed. |

Password reset link/token phải không xuất hiện trong log. Login response không
phân biệt user không tồn tại với password sai.

## 4. Catalog and admin endpoints

| Method/path | Auth | Mục đích |
|---|---|---|
| `GET /card-catalog/providers` | Public | Provider active. |
| `GET /card-catalog/products?provider=VCB` | Public | Product active theo provider. |
| `GET /card-catalog/products/:presetId` | Public | Product detail active. |
| `GET /admin/card-catalog/products` | Admin | Toàn catalog gồm inactive + audit metadata. |
| `POST /admin/card-catalog/products` | Admin | Tạo product; validate toàn catalog. |
| `PATCH /admin/card-catalog/products/:presetId` | Admin | Sửa field cho phép; ghi audit. |
| `PATCH /admin/card-catalog/providers/:providerCode` | Admin | Sửa provider name/active hàng loạt. |
| `GET/POST /banks` | Session/Admin write | Read legacy banks; admin tạo. |
| `PUT/DELETE /banks/:id` | Admin | Sửa/xóa bank. |
| `GET/POST /cardtypes` | Session/Admin write | Read legacy card networks; admin tạo. |
| `PUT/DELETE /cardtypes/:id` | Admin | Sửa/xóa network legacy. |

Catalog create/update request phải chứa các field canonical như `presetId`,
`providerCode`, `displayName`, `network`, `sourceUrl`, `sourceCheckedAt`,
`active`, `sortOrder`, `theme`; server bỏ qua/không cho phép field ngoài allowlist.

## 5. User card endpoints

| Method/path | Auth | Request/response |
|---|---|---|
| `GET /cards` | Session | Danh sách card trong workspace. |
| `POST /cards` | Session | Product reference + owner + operational config; server snapshot product; `201 {data}`. |
| `GET /cards/:id` | Session | Chi tiết card nếu cùng workspace. |
| `PUT /cards/:id` | Session | Chỉ operational fields; snapshot identity read-only. |
| `DELETE /cards/:id` | Session | Xóa theo policy; response message/data. |
| `GET /cards/duplicates` | Session | Exact duplicate groups, không mutate. |
| `POST /cards/duplicates` | Session | `{sourceCardId,targetCardId}`; merge có chủ đích, trả target + deleted source id. |

Resource không tồn tại hoặc ngoài workspace đều xử lý như `404 CARD_NOT_FOUND`
để tránh resource enumeration.

## 6. Transaction and statement endpoints

| Method/path | Auth | Request/response |
|---|---|---|
| `GET /financial-transactions?accountId=&categoryId=&from=&to=` | Session | Unified transactions scoped to workspace. |
| `POST /financial-transactions` | Session | Creates a Financial Domain transaction through the service layer. |
| `GET /card-statements` | Session | Statements của tất cả card trong workspace. |
| `GET /cards/:id/statements` | Session | Statements của card. |
| `GET /cards/:id/statements/:statementId` | Session | Statement + transactions + summary. |
| `PATCH /cards/:id/statements/:statementId/payment` | Session | `{action:"CLOSED"|"PAID"|"REOPEN",paidAmount?}`; enforce state machine. |
| `POST /cards/:id/statements/:statementId/calendar-email` | Session | Không nhận recipient; server gửi tới email user hiện tại. |

Summary response nên có:

```json
{
  "data": {
    "statementDate": "2026-08-07",
    "paymentDueDate": "2026-08-22",
    "effectivePaymentStatus": "OPEN",
    "summary": {
      "statementAmount": 12000000,
      "paymentAmount": 0,
      "outstandingAmount": 12000000,
      "personalSpending": 12000000,
      "outstandingReceivable": 0,
      "reimbursementReceived": 0,
      "transactionCount": 3
    },
    "transactions": []
  }
}
```

## 7. Cashback, fee and report endpoints

| Method/path | Auth | Mục đích |
|---|---|---|
| `GET /cards/:cardId/monthly-cashbacks` | Session | List bank cashback record. |
| `GET /cards/:cardId/monthly-cashbacks/:period` | Session | Read one month. |
| `PUT /cards/:cardId/monthly-cashbacks/:period` | Session | Upsert `{expectedAmount,actualAmount?,status,note}`; `RECEIVED` cần actual. |
| `DELETE /cards/:cardId/monthly-cashbacks/:period` | Session | Xóa record. |
| `GET /cards/:cardId/fee-payments` | Session | Fee history. |
| `POST /cards/:cardId/fee-payments` | Session | `{paymentDate,amount,note?}`. |
| `PUT /cards/:cardId/fee-payments/:feePaymentId` | Session | Sửa actual fee. |
| `DELETE /cards/:cardId/fee-payments/:feePaymentId` | Session | Xóa fee. |
| `GET /financial-reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | Session | Financial report theo khoảng ngày; output `range`, `totals`, `netAssets`, `creditDebtBalance`, nhóm account/category. |
| `GET /financial-reports/credit-statements?from=YYYY-MM-DD&to=YYYY-MM-DD` | Session | Credit statement projection dùng canonical `StatementQueryService`; `from/to` tùy chọn. |
| `GET /notes` | Session | List note workspace. |
| `POST /notes` | Session | `{date,content}`; content rỗng là delete. |

Report query hiện tại:

```text
from=2026-08-01
to=2026-08-31
```

Owner/card/year/month filters và fee/cashback report parity chưa nằm trong
runtime contract hiện tại; phải mở thành contract slice riêng trước khi thêm
query parameters. `creditStatements` trả compatibility field names nhưng
amount semantics lấy persisted `creditDebt`/impact từ canonical statement DTO.

## 8. Calendar, profile and admin endpoints

| Method/path | Auth | Mục đích |
|---|---|---|
| `GET /calendar-subscriptions` | Session | List metadata, không trả token. |
| `POST /calendar-subscriptions` | Session | `{deviceLabel?}`; trả raw feed URL đúng một lần. |
| `DELETE /calendar-subscriptions/:id` | Session | Revoke token. |
| `GET /calendar-subscriptions/feed/:token.ics` | Private token | Read-only unpaid due events; log access không ghi token. |
| `GET /profile` | Session | Current user non-secret profile. |
| `PATCH /profile` | Session | Chỉ display name field. |
| `GET /workspace/owner` | Session | Owner configuration status. |
| `PUT /workspace/owner` | Session | Cấu hình owner theo policy. |
| `GET /admin/users` | Admin | List users non-secret. |
| `PATCH /admin/users/:id` | Admin | Update allowlisted displayName/role/workspaceId. |
| `GET /admin/audit-logs?...` | Admin | Filtered, bounded audit list. |

## 9. Idempotency, concurrency and rate limits

## 10. Stitch UI projections

| Method/path | Auth | Mục đích |
|---|---|---|
| `GET /notifications?limit=50` | Session | Read-only payment-due notification projection scoped theo workspace; không trả secret hoặc raw reminder token. |

The projection is intentionally derived from authoritative card statements. UI
actions still use the statement payment state-machine endpoint, so the
notifications screen cannot create a second payment authority.

- Statement create dùng unique key để hai request đồng thời không tạo duplicate;
  route phải xử lý duplicate key bằng read-after-conflict.
- Monthly cashback upsert theo unique card/period.
- Reminder delivery claim theo unique statement/days-before và lease timeout.
- Calendar revoke phải scoped user/workspace và idempotent với token đã revoke.
- Production nên rate-limit login, reset request, bootstrap và public feed; không
  rate-limit mutation đến mức làm mất trải nghiệm offline-like nếu chưa có
  requirement cụ thể.
