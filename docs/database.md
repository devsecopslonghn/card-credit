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

### Rollback

- Additive fields/index có thể giữ khi rollback code.
- Data rewrite cần backup/restore hoặc reverse migration được review.
- Deployment rollback dùng image tag trước; không chạy dual-write thường trực.
- Không dùng `git reset --hard`, drop collection hoặc migration destructive tự
  động trong CI.
