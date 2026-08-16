# Database design — Card Credit

## 1. Storage principles

- MongoDB là source of truth duy nhất cho runtime mutable data.
- Tất cả financial amount là `Number` integer VND và phải nằm trong
  `Number.isSafeInteger`.
- Date nghiệp vụ là string `YYYY-MM-DD`; calendar period là `YYYY-MM` để lọc
  không phụ thuộc timezone của server.
- Private collection có `workspaceId`; `userId` được giữ thêm khi ownership/audit
  cần thiết.
- Read path không được tự mutate catalog/card snapshot.
- Mongo `_id` không trả trực tiếp nếu DTO có public identifier; serialize nhất
  quán bằng string.

## 2. Entities

### User (`users`)

`_id`, `email` unique normalized lowercase, `passwordHash`, `role` (`admin|user`),
`workspaceId`, `displayName`, `active`, `lockedAt`, `lastLoginAt`,
`passwordChangedAt`, timestamps.

Không lưu PAN/CVV/OTP. Password hash và reset metadata không được trả về client.

### PasswordResetToken (`passwordresettokens`)

`tokenHash`, `userId`, `email`, `expiresAt`, `usedAt`, timestamps. Raw token chỉ
ở response/link delivery trong thời gian ngắn theo policy; không lưu raw.

### Workspace (`workspaces`)

`workspaceId` unique, `ownerUserId`, timestamps. Các user cùng `workspaceId`
nhìn thấy dữ liệu domain theo role policy.

### CreditCard / User Card (`creditcards`)

Identity: `workspaceId`, `userId`, `owner`, `active`.

Catalog snapshot: `presetId`, `providerCode`, `providerName`, `displayName`,
`network`, `catalogVersion`, `legacy`, `imageUrl`, `annualFee` và legacy aliases
(`bank`, `name`, `type`).

Operational config: `statementDay`, `paymentDueDays`, `annualFeeWaiverTarget`,
`cashbackCapAmount`, `cashbackCapPeriod`, reminder enabled/days/timezone/time.
Legacy fields như `monthlyData` giữ để compatibility/recovery nhưng không phải
nguồn chính cho debt/report mới.

### CardProduct (`cardproducts`)

`presetId` unique immutable, `providerCode`, `providerName`, `displayName`,
`network`, `segment`, `annualFee`, `targetSpendForWaiver`, `imageUrl`,
`benefits[]`, `sourceUrl`, `sourceCheckedAt`, `active`, `sortOrder`, `theme`,
timestamps.

Catalog product inactive vẫn giữ để history/audit; chỉ active product selectable
cho card mới.

### CardProductImage (`cardproductimages`)

`presetId` unique, `sourceUrl`, `contentType`, binary `data` nếu cache, `byteSize`,
`sha256`, `status` (`VERIFIED|BROKEN`), `checkedAt`, `errorMessage`, timestamps.

### CardStatement (`cardstatements`)

`workspaceId`, `userId`, `userCardId`, `periodStartDate`, `periodEndDate`,
`statementDate`, `paymentDueDate`, `statementDaySnapshot`,
`paymentDueDaysSnapshot`, `paymentStatus`, `paidAt`, `paidAmount`, timestamps.

Statement summary được tính từ transactions thay vì lưu bản sao có nguy cơ stale;
nếu materialize về sau phải có rebuild/consistency strategy.

### MonthlyCardCashback (`monthlycardcashbacks`)

`workspaceId`, `userId`, `userCardId`, `period`, `expectedAmount`, `actualAmount`,
`status`, `receivedAt`, `note`, timestamps.

### CardFeePayment (`cardfeepayments`)

`workspaceId`, `userId`, `userCardId`, `paymentDate`, positive `amount`, `note`,
timestamps. Chỉ ghi phí thực tế đã thu.

### CalendarSubscription (`calendarsubscriptions`)

`userId`, `workspaceId`, `deviceLabel`, `tokenHash` unique/select false,
`revokedAt`, `lastAccessedAt`, timestamps. Raw token không persist.

### ReminderDelivery (`reminderdeliveries`)

`workspaceId`, `cardId`, `statementId`, `daysBefore`, `status`, `attemptCount`,
`nextAttemptAt`, `claimedAt`, `sentAt`, `failureCode`, timestamps. Là idempotency
record và lease state cho scheduler.

### CalendarNote (`notes`)

`workspaceId`, `date`, `content`, timestamps. Unique theo workspace/date trong
repository implementation.

### AuthAuditLog (`authauditlogs`)

`event`, actor user/email/workspace nếu có, request id, resource type/id, result
code và timestamps. Không ghi password, cookie, token hay secret.

### CommandReceipt (`commandreceipts`)

Generic idempotency receipt cho command mới; không dùng tên MCP và không thay thế
`mcpmutations` trong slice migration đầu tiên. Fields gồm `workspaceId`, `userId`,
`channel`, `operation`, `idempotencyKey`, canonical `payloadHash`, status
(`PENDING|COMPLETED|FAILED`), optional result/errorCode và completion timestamp.
Receipt chỉ được reserve/complete trong cùng Mongo transaction với business write
khi command đã được tích hợp; không lưu raw payload, token hoặc secret.

### CommandAudit (`commandaudits`)

Append-only success audit cho command guard, gồm actor/channel, workspace,
correlationId, operation, endpoint/tool, optional previewId, safe resource IDs,
outcome và errorCode. Slice foundation chỉ ghi `SUCCESS` sau completed receipt;
failed-attempt policy sẽ được chốt khi tích hợp adapter. Không expose update/delete
service và không coi `McpMutation` receipt là audit.

### CommandPreview (`commandpreviews`)

Persistent one-time preview metadata cho mutation có confirmation. Fields gồm
`workspaceId`, `userId`, `channel`, `operation`, server-generated `previewId`,
canonical `payloadHash`, SHA-256 `tokenHash`, status (`ISSUED|CONSUMED`),
`expiresAt`, `consumedAt` và timestamps. Không lưu raw payload, confirmation
token hoặc secret. Expiry là trạng thái suy ra từ `expiresAt`; command transaction
không ghi `ISSUED -> EXPIRED` rồi rollback, cleanup/retention là job riêng.

### Legacy masterdata (`banks`, `cardtypes`)

Duy trì để tương thích UI/API cũ. Catalog mới là authority cho provider/network;
không dùng legacy masterdata để overwrite snapshot card.

## 3. Relationships

```text
User 1 ---- N CreditCard N ---- 1 CardProduct (logical preset snapshot)
 |                 |
 |                 +---- N CardStatement 1 ---- N FinancialTransaction
 |                 |
 |                 +---- N MonthlyCardCashback
 |                 |
 |                 +---- N CardFeePayment
 |
 +---- N CalendarSubscription
 +---- N AuthAuditLog

Workspace 1 ---- N User/Card/Statement/Transaction/Cashback/Fee/Note/Delivery
CardProduct 1 ---- 0..1 CardProductImage
CardStatement 1 ---- N ReminderDelivery (unique by daysBefore)
```

MongoDB không enforce foreign key; mọi route phải kiểm tra parent trong cùng
workspace trước mutation, đặc biệt `userCardId`, `statementId` và feed projection.

## 4. Index strategy

| Collection | Index | Mục đích |
|---|---|---|
| users | `{ email: 1 }` unique | Login/registration lookup. |
| passwordresettokens | `{ tokenHash: 1, usedAt: 1, expiresAt: 1 }` | Validate reset token; TTL có thể bổ sung theo policy. |
| workspaces | `{ workspaceId: 1 }` unique | Resolve workspace. |
| creditcards | `{ workspaceId: 1, createdAt: -1 }` | Card list. |
| creditcards | `{ workspaceId: 1, owner: 1 }` | Owner filter. |
| creditcards | `{ workspaceId: 1, presetId: 1 }` | Catalog/duplicate lookup. |
| cardproducts | `{ presetId: 1 }` unique | Product detail/import idempotency. |
| cardproducts | `{ providerCode: 1, active: 1, sortOrder: 1 }` | Picker/provider listing. |
| cardproductimages | `{ presetId: 1 }` unique | Image cache lookup. |
| cardstatements | `{ workspaceId: 1, userCardId: 1, statementDate: 1 }` unique | No duplicate statement. |
| cardstatements | `{ workspaceId: 1, paymentStatus: 1, paymentDueDate: 1 }` | Dashboard/reminder due scan. |
| financialtransactions | `{ workspaceId: 1, transactionDate: -1, createdAt: -1 }` | Unified finance list/report input. |
| financialtransactions | `{ workspaceId: 1, accountId: 1, transactionDate: -1 }` | Account balance/history. |
| monthlycardcashbacks | `{ workspaceId: 1, userCardId: 1, period: 1 }` unique | Monthly upsert. |
| monthlycardcashbacks | `{ workspaceId: 1, period: -1 }` | Range report. |
| cardfeepayments | `{ workspaceId: 1, userCardId: 1, paymentDate: -1, createdAt: -1 }` | Fee history/range. |
| calendarsubscriptions | `{ tokenHash: 1 }` unique | Feed auth. |
| calendarsubscriptions | `{ userId: 1, workspaceId: 1, createdAt: -1 }` | Subscription management. |
| reminderdeliveries | `{ workspaceId: 1, statementId: 1, daysBefore: 1 }` unique | Idempotent delivery. |
| reminderdeliveries | `{ status: 1, nextAttemptAt: 1, claimedAt: 1 }` | Worker claim/recovery. |
| notes | `{ workspaceId: 1, date: 1 }` unique | Calendar note upsert. |
| authauditlogs | `{ createdAt: -1 }`, event/resource filters | Admin investigation. |
| commandreceipts | `{ workspaceId: 1, operation: 1, idempotencyKey: 1 }` unique | Generic idempotency reservation/replay. |
| commandreceipts | `{ workspaceId: 1, createdAt: -1 }` | Workspace retention/investigation. |
| commandaudits | `{ workspaceId: 1, createdAt: -1 }` | Append-only command audit feed. |
| commandaudits | `{ workspaceId: 1, operation: 1, createdAt: -1 }` | Operation-specific audit query. |

Index choices phải được kiểm tra bằng `explain()` trên dataset representative;
không thêm index tùy tiện trên high-write collections nếu không có query owner.

## 5. Migration strategy

### Baseline and compatibility

1. Giữ field legacy trong `CreditCard`; đọc bằng canonical field trước, alias
   sau.
2. Không migrate destructive hoặc rename collection trong cùng release với
   feature nghiệp vụ.
3. Mọi migration có version marker, dry-run count, backup requirement và log
   không chứa secret.

### Catalog migration

1. Validate version-controlled JSON.
2. Dry-run so sánh theo `presetId`, báo create/update/unchanged/conflict.
3. Review output và backup MongoDB.
4. Apply idempotent lên `cardproducts`; production yêu cầu explicit override.
5. Không tự động cập nhật snapshot trên `creditcards`.

### Statement/transaction migration

1. Đưa card config mới vào model với default an toàn.
2. Backfill statement/transaction chỉ khi có mapping được review; không suy đoán
   lịch sử từ `monthlyData`.
3. Nếu không đủ dữ liệu, giữ card legacy và yêu cầu user nhập transaction mới.
4. Validate counts/sums trước và sau, chạy read-only reconciliation.

### Generic command guard rollout

1. `backend/scripts/ensure-command-guard-indexes.ts` mặc định chạy dry-run; chỉ
   tạo collection/index khi `COMMAND_GUARD_INDEX_APPLY=true`.
2. Trước apply phải backup metadata/collection ở cluster đích và kiểm tra
   duplicate receipt key; script fail-closed nếu duplicate tồn tại.
3. Foundation không migrate/xóa `mcpmutations`; adapter integration từng command
   là slice riêng và phải ghi migration note/retention policy.
4. Nếu chưa có writer, rollback bằng revert code và drop chính xác named indexes
   mới chỉ khi collections rỗng. Khi đã có receipt/audit, giữ dữ liệu và revert
  adapter code, không xóa receipt để chạy lại command.

5. Preview one-time rollout phải kiểm tra duplicate (`workspaceId + previewId`)
   và (`workspaceId + tokenHash`) trước khi apply; tạo bốn named indexes cho
   `commandpreviews` (`command_preview_unique`, `command_preview_token_unique`,
   `command_preview_workspace_created`, `command_preview_expiry`) bằng cùng script
   dry-run/apply. Phải backup workspace trước apply và fence old MCP writers vì
   token v1/stateless từ pod cũ không có preview record.

#### Rollout ledger — 2026-08-16

- Cluster context `k8s-admin-public`, namespace `card-credit`; target pod
  `card-credit-backend-68ffb6578f-6tzvq`.
- Backup trước mutation: `/tmp/card-credit-command-guard-backup/finance-
  longhn0710-workspace-2026-08-16T14-54-00.001Z.json`, local mode `600`; không
  commit và không chứa secret.
- Preflight: `commandreceipts=0`, `commandaudits=0`, duplicate receipt groups
  `0`; apply tạo và verify đủ bốn named indexes theo bảng trên.
- Code commit `0ee1cef` đã push trước DB mutation. Vì deployment hiện tại vẫn
  là image cũ, indexes là additive chuẩn bị trước; chỉ adapter sau khi deploy
  code mới mới được phép ghi receipt/audit.

### Rollback

- Additive fields/index có thể giữ khi rollback code.
- Data rewrite cần backup/restore hoặc reverse migration được review.
- Deployment rollback dùng image tag trước; không chạy dual-write thường trực.
- Không dùng `git reset --hard`, drop collection hoặc migration destructive tự
  động trong CI.
