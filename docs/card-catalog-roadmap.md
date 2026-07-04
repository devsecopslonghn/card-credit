# CARD-CREDIT — TODO LIST VÀ DEFINITION OF DONE

## 1. Mục tiêu kiến trúc

Chuyển ứng dụng từ mô hình:

```text
Người dùng tự nhập:
bank + card name + network + annual fee + image + owner
```

sang mô hình catalog-first:

```text
Provider/ngân hàng
    └── Card Product
            ├── Tên sản phẩm
            ├── Network
            ├── Phí thường niên
            ├── Hình ảnh
            ├── Nguồn dữ liệu
            └── Trạng thái hoạt động

Người dùng sở hữu thẻ
    ├── Chọn Card Product
    └── Nhập thông tin chủ thẻ
```

Payload tạo thẻ mới mục tiêu:

```json
{
  "presetId": "sacombank-visa-platinum-cashback",
  "owner": "Long Ho"
}
```

Server chịu trách nhiệm lấy toàn bộ thông tin sản phẩm từ catalog và lưu snapshot vào bản ghi `CreditCard`.

---

# PHASE 0 — CHỐT BASELINE VÀ DOMAIN MODEL

## CC-001 — Ghi nhận baseline chức năng hiện tại

**Ưu tiên:** P0
**Kích thước:** S

### Todo

* Ghi lại các chức năng đang hoạt động:

  * Danh sách thẻ.
  * Thêm, sửa, xóa thẻ.
  * Đánh dấu đã thanh toán.
  * Lọc theo chủ thẻ.
  * Calendar note.
  * Upcoming payments.
  * Trang chi tiết thẻ.
  * Báo cáo summary.
* Ghi lại API contract hiện tại.
* Chuẩn bị dữ liệu mẫu gồm ít nhất:

  * Một thẻ Sacombank.
  * Một thẻ ngân hàng khác.
  * Một thẻ có dữ liệu tháng.
  * Một thẻ chưa có ngày thanh toán.
* Chạy và ghi nhận kết quả:

  * `npm install`
  * `npm run lint`
  * `npm run build`
  * Chạy ứng dụng local.

### Definition of Done

* Có tài liệu baseline trong `docs/current-behavior.md`.
* Có danh sách API và payload hiện tại.
* Build hiện tại thành công hoặc các lỗi baseline đã được ghi lại rõ ràng.
* Có dữ liệu mẫu dùng để regression test.
* Không thay đổi chức năng trong task này.

---

## CC-002 — Chuẩn hóa thuật ngữ nghiệp vụ

**Ưu tiên:** P0
**Kích thước:** S

### Todo

Thống nhất các thuật ngữ:

* `Provider`: tổ chức phát hành, ví dụ Sacombank, HSBC.
* `Card Product`: sản phẩm thẻ cụ thể, ví dụ Visa Platinum Cashback.
* `Network`: Visa, Mastercard, JCB, American Express.
* `User Card` hoặc `CreditCard`: thẻ cụ thể mà người dùng đang sở hữu.
* `Owner`: chủ thẻ.
* `Catalog`: danh sách Card Product chuẩn.
* `Snapshot`: dữ liệu sản phẩm được sao chép vào User Card tại thời điểm tạo.

Không sử dụng `CardType` để vừa biểu diễn network, vừa biểu diễn sản phẩm thẻ.

### Definition of Done

* Có `docs/domain-model.md`.
* Các type mới trong mã nguồn sử dụng đúng thuật ngữ.
* `CardType` hiện tại được ghi rõ là network masterdata.
* Không còn code mới gọi Visa Platinum Cashback là một `CardType`.
* Không nhất thiết phải rename collection hoặc route cũ trong giai đoạn này.

---

## CC-003 — Định nghĩa type cho Card Catalog

**Ưu tiên:** P0
**Kích thước:** S
**Files:** `lib/cardPresets.ts` hoặc thư mục `types/`

### Todo

Tạo type dùng chung:

```ts
type CardCatalogProduct = {
  presetId: string;
  providerCode: string;
  providerName: string;
  displayName: string;
  network: string;
  segment?: string;
  annualFee: number | null;
  targetSpendForWaiver?: number | null;
  imageUrl: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  active: boolean;
  sortOrder?: number;
};
```

Tạo type nhóm provider:

```ts
type CardCatalogProvider = {
  providerCode: string;
  providerName: string;
  logoUrl?: string;
  products: CardCatalogProduct[];
};
```

### Definition of Done

* Catalog không còn dùng type ngầm định hoặc `any`.
* Type được sử dụng bởi loader, API catalog và UI.
* `presetId` được khai báo là định danh duy nhất.
* `annualFee` hỗ trợ rõ trường hợp chưa xác định bằng `null`.
* TypeScript build không có lỗi.

---

# PHASE 1 — CHUẨN HÓA CARD CATALOG

## CC-004 — Audit toàn bộ dữ liệu preset hiện tại

**Ưu tiên:** P0
**Kích thước:** M
**Files:** `data/card-presets.json`

### Todo

Kiểm tra từng preset:

* `presetId` có duy nhất không.
* Provider có đúng không.
* Tên sản phẩm có đúng không.
* Network có đúng không.
* Phí thường niên có đúng kiểu dữ liệu không.
* URL hình ảnh có khớp sản phẩm không.
* `sourceUrl` còn truy cập được không.
* `sourceCheckedAt` có hợp lệ không.
* Có sản phẩm trùng hoặc gần trùng không.
* Kiểm tra lỗi đã phát hiện: JCB Ultimate đang có dấu hiệu sử dụng ảnh American Express.

### Definition of Done

* Có báo cáo audit tại `docs/card-catalog-audit.md`.
* Mỗi preset được phân loại:

  * Valid.
  * Needs correction.
  * Missing information.
  * Deprecated.
* Không còn `presetId` trùng.
* Các ảnh sai rõ ràng đã được sửa.
* Dữ liệu không xác minh được phải dùng `null`, không tự đoán.

---

## CC-005 — Chuẩn hóa cấu trúc `card-presets.json`

**Ưu tiên:** P0
**Kích thước:** M
**Files:** `data/card-presets.json`

### Todo

Mỗi sản phẩm phải có tối thiểu:

```json
{
  "presetId": "sacombank-visa-platinum-cashback",
  "providerCode": "STB",
  "providerName": "Sacombank",
  "displayName": "Visa Platinum Cashback",
  "network": "Visa",
  "annualFee": null,
  "imageUrl": "",
  "active": true,
  "sortOrder": 10
}
```

Chuẩn hóa:

* `providerCode` viết hoa và ổn định.
* `presetId` viết lowercase kebab-case.
* `displayName` là tên hiển thị chính thức.
* `network` không chứa hạng thẻ.
* `annualFee` là number hoặc `null`.
* `active` bắt buộc.
* `sortOrder` dùng để sắp xếp ổn định.
* Giữ `sourceUrl` và `sourceCheckedAt` để truy xuất nguồn.

### Definition of Done

* 100% preset tuân theo schema catalog mới.
* Không còn sử dụng đồng thời nhiều tên field cho cùng một ý nghĩa.
* Có validation tự động cho file JSON.
* Catalog load được mà không phát sinh lỗi runtime.
* Thứ tự sản phẩm không phụ thuộc thứ tự ngẫu nhiên trong file.

---

## CC-006 — Bổ sung các sản phẩm Sacombank cần thiết

**Ưu tiên:** P0
**Kích thước:** S
**Files:** `data/card-presets.json`

### Todo

Bổ sung tối thiểu:

* Sacombank Visa Platinum Cashback.
* Sacombank Platinum American Express®.

Với mỗi sản phẩm:

* Tên chính xác.
* Network chính xác.
* Phí thường niên.
* URL ảnh.
* URL nguồn chính thức.
* Ngày kiểm tra nguồn.
* Trạng thái active.
* Thứ tự hiển thị.

Không sử dụng số phí ví dụ trong báo cáo nếu chưa xác minh từ nguồn chính thức.

### Definition of Done

* Hai sản phẩm xuất hiện dưới provider Sacombank.
* Phí thường niên có nguồn tham chiếu.
* Hình ảnh hiển thị đúng sản phẩm.
* Có fallback nếu ảnh nguồn không tải được.
* Hai sản phẩm có thể được chọn trong flow thêm thẻ mới.

---

## CC-007 — Refactor `lib/cardPresets.ts` thành catalog service

**Ưu tiên:** P0
**Kích thước:** M
**Files:** `lib/cardPresets.ts`

### Todo

Bổ sung các helper:

```ts
getAllCatalogProducts()
getActiveCatalogProducts()
getCatalogProviders()
getProductsByProvider(providerCode)
getPresetById(presetId)
groupProductsByProvider()
```

Quy tắc:

* Không mutate dữ liệu gốc.
* Chỉ trả sản phẩm active cho UI người dùng.
* Sort provider và product ổn định.
* Có fallback ảnh.
* Không để logic grouping nằm rải rác trong UI.

### Definition of Done

* UI và API không tự đọc trực tiếp file JSON.
* Lookup bằng `presetId` trả đúng một sản phẩm hoặc `undefined`.
* Grouping theo provider hoạt động ổn định.
* Sản phẩm inactive không xuất hiện trong flow thêm thẻ.
* Có unit test cho các helper chính.

---

## CC-008 — Chuẩn hóa pipeline hình ảnh thẻ

**Ưu tiên:** P1
**Kích thước:** M
**Files:** `scripts/prepare-card-images.mjs`, `data/card-image-manifest.json`

### Todo

* Hỗ trợ ảnh từ `imageUrl`.
* Cache ảnh về local khi build nếu cần.
* Không làm build fail hoàn toàn chỉ vì một ảnh remote hỏng.
* Sinh placeholder rõ ràng khi ảnh thiếu.
* Ghi nhận trạng thái tải ảnh vào manifest.
* Không lưu ảnh base64 trong bản ghi User Card mới.
* Quy định rõ ảnh nào được commit, ảnh nào được generate khi build.
* Kiểm tra Jenkins cleanup không xóa nhầm artifact cần thiết.

### Definition of Done

* Build thành công khi một nguồn ảnh không truy cập được.
* UI vẫn có placeholder hợp lệ.
* Manifest xác định được ảnh nào tải thành công hoặc thất bại.
* Không có card bị vỡ layout vì ảnh lỗi.
* Pipeline Docker và Jenkins xử lý ảnh giống nhau.

---

## CC-009 — Tạo quality gate cho catalog

**Ưu tiên:** P1
**Kích thước:** M
**Files:** `scripts/validate-card-catalog.mjs`, `package.json`

### Todo

Tạo command:

```bash
npm run validate:catalog
```

Kiểm tra:

* Duplicate `presetId`.
* Thiếu provider.
* Thiếu display name.
* Network không hợp lệ.
* `annualFee` âm hoặc sai kiểu.
* URL không hợp lệ.
* Ngày source sai format.
* Sản phẩm active nhưng thiếu ảnh.
* Sản phẩm active nhưng thiếu nguồn.
* Ảnh có tên hoặc mapping đáng ngờ.

### Definition of Done

* Command trả exit code khác 0 khi dữ liệu không hợp lệ.
* Validation chạy trong CI.
* Output chỉ rõ preset và field bị lỗi.
* Catalog hiện tại vượt qua validation.
* Không cần khởi động MongoDB để chạy validation.

---

# PHASE 2 — API CATALOG VÀ CREDIT CARD MODEL

## CC-010 — Tạo API đọc Card Catalog

**Ưu tiên:** P0
**Kích thước:** M
**Files:** `app/api/card-catalog/**`

### Todo

Tạo các endpoint:

```text
GET /api/card-catalog/providers
GET /api/card-catalog/products?provider=STB
GET /api/card-catalog/products/:presetId
```

Response phải:

* Chỉ trả sản phẩm active mặc định.
* Sort ổn định.
* Không để lộ field nội bộ không cần thiết.
* Trả mã lỗi rõ ràng khi provider hoặc preset không tồn tại.
* Có TypeScript type.

### Definition of Done

* API providers trả đúng danh sách provider.
* API products lọc đúng theo provider.
* API product detail trả đúng sản phẩm.
* Provider không tồn tại trả response phù hợp.
* Preset không tồn tại trả HTTP 404.
* Có integration test cho cả ba endpoint.

---

## CC-011 — Mở rộng schema `CreditCard`

**Ưu tiên:** P0
**Kích thước:** M
**Files:** `models/CreditCard.ts`

### Todo

Bổ sung:

```ts
presetId?: string;
providerCode?: string;
providerName?: string;
displayName?: string;
network?: string;
catalogVersion?: string;
legacy?: boolean;
```

Tiếp tục giữ các field snapshot hiện tại:

```ts
bank;
name;
type;
imageUrl;
annualFee;
```

Không xóa field cũ trong release đầu tiên.

### Definition of Done

* Bản ghi cũ vẫn đọc được.
* Bản ghi mới lưu đủ preset và snapshot.
* Các field mới không làm Mongoose lỗi với document legacy.
* Có index phù hợp cho `presetId`, `providerCode` nếu cần.
* Không làm mất `monthlyData` hoặc dữ liệu thanh toán hiện tại.

---

## CC-012 — Tạo Card creation service

**Ưu tiên:** P0
**Kích thước:** M
**Files:** đề xuất `lib/services/cardService.ts`

### Todo

Tạo hàm:

```ts
createCardFromPreset({
  presetId,
  owner
})
```

Service phải:

* Validate preset tồn tại.
* Validate preset active.
* Normalize owner.
* Snapshot thông tin từ catalog.
* Tạo giá trị mặc định cho payment và monthly data.
* Không tin tưởng dữ liệu product do client gửi lên.

### Definition of Done

* Chỉ `presetId` và `owner` là input nghiệp vụ bắt buộc.
* Client không thể ghi đè `annualFee`, `providerName`, `imageUrl`.
* Snapshot được tạo nhất quán.
* Preset inactive không thể dùng để tạo thẻ mới.
* Logic tạo thẻ không nằm trực tiếp toàn bộ trong API route.

---

## CC-013 — Đổi contract `POST /api/cards`

**Ưu tiên:** P0
**Kích thước:** M
**Files:** `app/api/cards/route.ts`

### Todo

Contract mới:

```json
{
  "presetId": "sacombank-visa-platinum-cashback",
  "owner": "Long Ho"
}
```

Xử lý lỗi:

* Body không phải JSON.
* Thiếu preset.
* Preset không tồn tại.
* Preset inactive.
* Owner trống.
* Database lỗi.
* Catalog lỗi.

Trong thời gian migration có thể hỗ trợ contract cũ bằng chế độ compatibility, nhưng phải ghi log cảnh báo deprecated.

### Definition of Done

* Payload mới tạo được bản ghi đầy đủ.
* Payload cố tình sửa annual fee không có tác dụng.
* HTTP status được sử dụng nhất quán:

  * 400: request không hợp lệ.
  * 404: preset không tồn tại.
  * 409: xung đột nghiệp vụ nếu có.
  * 500: lỗi hệ thống.
* Response lỗi có cấu trúc thống nhất.
* Có integration test cho success và failure.

---

## CC-014 — Giới hạn field được phép sửa qua `PUT /api/cards/:id`

**Ưu tiên:** P0
**Kích thước:** M
**Files:** `app/api/cards/[id]/route.ts`

### Todo

Tạo allowlist cho các field vận hành:

* `owner`.
* `targetSpendForWaiver`.
* `statementDate`.
* `paymentDueDate`.
* `amountDueThisMonth`.
* `isPaidThisMonth`.
* `monthlyData`.

Không cho sửa trực tiếp qua route thông thường:

* `presetId`.
* `providerCode`.
* `providerName`.
* `displayName`.
* `network`.
* `annualFee`.
* `imageUrl`.

Nếu cần đổi sản phẩm, tạo nghiệp vụ riêng thay vì update tùy tiện.

### Definition of Done

* PUT không thể sửa identity của Card Product.
* Field ngoài allowlist bị bỏ qua hoặc trả lỗi rõ ràng.
* Dữ liệu cũ vẫn cập nhật được các field vận hành.
* Có test xác nhận annual fee không bị client sửa.
* DELETE hiện tại vẫn hoạt động.

---

## CC-015 — Chuẩn hóa validation và error response cho API

**Ưu tiên:** P1
**Kích thước:** M
**Files:** `app/api/**`, đề xuất `lib/api/`

### Todo

* Tạo schema validation cho request.
* Tạo helper response lỗi chung.
* Thêm `try/catch` vào các route chưa có.
* Không trả stack trace cho client.
* Chuẩn hóa response:

```json
{
  "error": {
    "code": "INVALID_OWNER",
    "message": "Tên chủ thẻ không hợp lệ.",
    "fields": {
      "owner": "..."
    }
  }
}
```

### Definition of Done

* Các route catalog và cards dùng cùng format lỗi.
* Request sai không làm route crash.
* Log server giữ được context kỹ thuật.
* Client nhận được message có thể hiển thị.
* Không còn `CreditCard.create(requestBody)` trực tiếp mà không validate.

---

## CC-016 — Hỗ trợ đọc tương thích dữ liệu legacy

**Ưu tiên:** P0
**Kích thước:** S
**Files:** API cards, UI listing, detail và report

### Todo

Khi đọc card:

```ts
providerName ?? bank
displayName ?? name
network ?? type
```

Đánh dấu card cũ:

```ts
legacy: true
```

khi không có `presetId`.

### Definition of Done

* Listing hiển thị được cả card cũ và card mới.
* Detail page mở được card cũ.
* Report không bỏ sót card cũ.
* UI không hiển thị `undefined`.
* Card legacy có thể nhận diện để migration hoặc review.

---

# PHASE 3 — UI/UX CATALOG-FIRST

## CC-017 — Tách nhỏ `app/cards/page.tsx`

**Ưu tiên:** P1
**Kích thước:** L
**Files:** `app/cards/page.tsx`, đề xuất `components/cards/`

### Todo

Tách tối thiểu:

```text
components/cards/
  CardList.tsx
  CardItem.tsx
  ProviderSection.tsx
  AddCardModal.tsx
  ProviderPicker.tsx
  ProductPicker.tsx
  OwnerField.tsx
  UpcomingPayments.tsx
```

Tách:

* Fetch catalog.
* Fetch cards.
* Grouping.
* Modal state.
* Form validation.
* Card rendering.

### Definition of Done

* `app/cards/page.tsx` chủ yếu làm orchestration.
* Component không chứa API logic không liên quan.
* Type được dùng chung.
* Không thay đổi chức năng ngoài phạm vi refactor.
* Lint và build thành công.

---

## CC-018 — Thiết kế lại modal thêm thẻ

**Ưu tiên:** P0
**Kích thước:** L
**Files:** `AddCardModal.tsx`

### Todo

Flow:

1. Chọn provider.
2. Chọn Card Product.
3. Xem preview:

   * Hình ảnh.
   * Tên sản phẩm.
   * Network.
   * Phí thường niên.
4. Nhập chủ thẻ.
5. Tạo thẻ.

Loại khỏi form người dùng:

* Nhập tay ngân hàng.
* Nhập tay tên thẻ.
* Nhập tay network.
* Nhập tay annual fee.
* Upload ảnh.
* Nhập image URL.

### Definition of Done

* Người dùng chỉ nhập thông tin chủ thẻ sau khi chọn sản phẩm.
* Không thể submit nếu chưa chọn provider.
* Không thể submit nếu chưa chọn product.
* Không thể submit nếu owner không hợp lệ.
* Preview cập nhật khi đổi product.
* Sau khi thành công:

  * Modal đóng.
  * Form reset.
  * Danh sách refresh.
  * Có thông báo thành công.
* API chỉ nhận `presetId + owner`.

---

## CC-019 — Chuẩn hóa thông tin chủ thẻ

**Ưu tiên:** P1
**Kích thước:** S

### Todo

* Trim khoảng trắng đầu và cuối.
* Gộp nhiều khoảng trắng liên tiếp.
* Không phân biệt owner chỉ vì khoảng trắng.
* Giới hạn độ dài.
* Hỗ trợ tiếng Việt.
* Không tự viết hoa hoặc thay đổi tên ngoài ý muốn.
* Cân nhắc datalist từ các owner hiện có.

### Definition of Done

* `" Long  Ho "` được lưu thành `"Long Ho"`.
* Owner rỗng hoặc chỉ chứa khoảng trắng bị từ chối.
* Owner dài quá giới hạn bị từ chối.
* Filter owner không sinh các lựa chọn trùng do khoảng trắng.
* Có unit test cho normalize owner.

---

## CC-020 — Group danh sách thẻ theo provider

**Ưu tiên:** P0
**Kích thước:** M
**Files:** `CardList.tsx`, `ProviderSection.tsx`

### Todo

Hiển thị:

```text
Sacombank (3)
  Card A
  Card B
  Card C

HSBC (2)
  Card D
  Card E
```

Quy tắc:

* Dùng `providerCode/providerName`.
* Card legacy fallback về `bank`.
* Provider có heading thật.
* Có số lượng card.
* Sort provider ổn định.
* Sort card trong provider ổn định.

### Definition of Done

* Mỗi card chỉ xuất hiện trong một provider section.
* Card legacy vẫn được group.
* Không có section mang tên `undefined`.
* Heading sử dụng `h2` hoặc `h3`.
* Owner filter vẫn hoạt động sau khi group.

---

## CC-021 — Chuyển card listing sang flex responsive

**Ưu tiên:** P0
**Kích thước:** M
**Files:** `CardList.tsx`, `CardItem.tsx`

### Todo

Sử dụng layout tương đương:

```tsx
<div className="flex flex-wrap items-stretch gap-4">
```

Card item:

* Co giãn theo chiều rộng.
* Có minimum width phù hợp.
* Có maximum width để không quá lớn.
* Mobile về một cột.
* Desktop có nhiều cột mềm.
* Không phụ thuộc số lượng cột cố định.

### Definition of Done

* Mobile khoảng 320–430px không scroll ngang.
* Tablet hiển thị hợp lý.
* Desktop tận dụng chiều rộng.
* Tên thẻ dài không làm vỡ layout.
* Ảnh lỗi không làm thay đổi bất thường chiều cao card.
* Các card cùng section có bố cục nhất quán.

---

## CC-022 — Nâng cấp nội dung Card Item

**Ưu tiên:** P1
**Kích thước:** M

### Todo

Mỗi card hiển thị tối thiểu:

* Hình thẻ.
* Provider.
* Display name.
* Network.
* Chủ thẻ.
* Phí thường niên.
* Ngày sao kê.
* Ngày thanh toán.
* Số tiền cần thanh toán.
* Trạng thái đã thanh toán.
* Nút sửa.
* Nút xóa.
* Link tới chi tiết.

### Definition of Done

* Phí được format theo `vi-VN`.
* Trường thiếu có fallback dễ hiểu.
* Nút icon có accessible label.
* Trạng thái thanh toán nhìn rõ nhưng không che thông tin chính.
* Card vẫn sử dụng được bằng keyboard.

---

## CC-023 — Cập nhật trang chi tiết thẻ

**Ưu tiên:** P1
**Kích thước:** M
**Files:** `app/cards/[id]/page.tsx`

### Todo

* Hiển thị `providerName`.
* Hiển thị `displayName`.
* Hiển thị `network`.
* Hiển thị ảnh catalog.
* Hiển thị phí thường niên snapshot.
* Khóa các field identity của sản phẩm.
* Chỉ cho sửa field vận hành.
* Với legacy card, hiển thị cảnh báo hoặc badge legacy.

### Definition of Done

* Trang detail hoạt động với card cũ và mới.
* Người dùng không sửa trực tiếp tên sản phẩm hoặc network.
* Monthly data không bị ảnh hưởng.
* Các phép tính spend, cashback, fee và net profit vẫn đúng.
* Không có regression với route hiện tại.

---

## CC-024 — Cập nhật report summary và export

**Ưu tiên:** P1
**Kích thước:** M
**Files:** `app/api/reports/summary/route.ts` và chức năng export liên quan

### Todo

Bổ sung vào response:

* `presetId`.
* `providerCode`.
* `providerName`.
* `displayName`.
* `network`.
* `legacy`.

Giữ field cũ trong giai đoạn compatibility.

### Definition of Done

* Report hiển thị tên sản phẩm mới.
* Có thể group hoặc filter theo provider.
* Card legacy vẫn xuất hiện.
* Export JSON không mất field cũ.
* Consumer cũ không bị vỡ trong release đầu.

---

## CC-025 — Chuẩn hóa Image URL trong màn hình quản trị

**Ưu tiên:** P2
**Kích thước:** M

### Todo

Trong màn hình quản trị Card Product tương lai:

* Dùng input `type="url"`.
* Có preview.
* Có fallback.
* Không upload base64 vào MongoDB.
* Cho phép kiểm tra URL.
* Hiển thị nguồn ảnh.
* Có cảnh báo ảnh từ domain không tin cậy.

Ở modal thêm User Card, ảnh chỉ được xem, không được sửa.

### Definition of Done

* Người dùng thường không thể sửa ảnh sản phẩm.
* Admin có thể nhập và preview image URL.
* URL sai có validation.
* URL hỏng không làm hỏng toàn bộ form.
* Không phát sinh document MongoDB chứa chuỗi base64 lớn.

---

## CC-026 — Hoàn thiện accessibility cho UI mới

**Ưu tiên:** P1
**Kích thước:** M

### Todo

* `role="dialog"`.
* `aria-modal="true"`.
* Focus trap.
* Escape để đóng modal.
* Return focus về nút mở modal.
* Keyboard navigation cho provider và product.
* `aria-live` cho thông báo.
* `aria-label` cho nút sửa/xóa.
* Alt text theo provider và product.
* Heading đúng cấp.
* Không chỉ dùng màu để biểu diễn trạng thái.

### Definition of Done

* Flow thêm thẻ hoàn tất được chỉ bằng keyboard.
* Focus không thoát khỏi modal khi modal mở.
* Screen reader đọc được tên product và annual fee.
* Nút icon có tên truy cập được.
* Lighthouse accessibility hoặc công cụ tương đương không có lỗi nghiêm trọng.

---

# PHASE 4 — MIGRATION VÀ COMPATIBILITY

## CC-027 — Viết migration mapping card cũ sang preset

**Ưu tiên:** P0
**Kích thước:** L
**Files:** đề xuất `scripts/migrate-credit-cards-to-catalog.mjs`

### Todo

Mapping theo:

```text
bank/provider + card name + network
```

Các trạng thái:

* Exact match.
* Probable match.
* No match.
* Ambiguous match.

Hỗ trợ:

```bash
npm run migrate:catalog -- --dry-run
npm run migrate:catalog -- --apply
```

Không tự động ghi probable hoặc ambiguous match nếu chưa có quy tắc an toàn.

### Definition of Done

* Dry-run không thay đổi database.
* Dry-run xuất báo cáo số lượng từng nhóm.
* Apply chỉ cập nhật exact match mặc định.
* Script có thể chạy lại mà không phá dữ liệu.
* Không sửa `monthlyData`.
* Không sửa thông tin thanh toán.
* Có log document nào đã thay đổi.

---

## CC-028 — Xử lý card không match catalog

**Ưu tiên:** P1
**Kích thước:** S

### Todo

Với card không match:

```ts
legacy: true
presetId: undefined
```

UI phải:

* Vẫn hiển thị card.
* Có badge legacy.
* Cho phép giữ nguyên.
* Có đường dẫn review hoặc map thủ công trong tương lai.

### Definition of Done

* Không card nào biến mất sau migration.
* Card unmatched vẫn có thể sử dụng.
* Report vẫn tính card legacy.
* Có danh sách card cần review.
* Không tự gán sai preset.

---

## CC-029 — Định nghĩa chính sách snapshot và đồng bộ catalog

**Ưu tiên:** P1
**Kích thước:** M

### Todo

Chốt quy tắc:

* Khi annual fee trong catalog thay đổi, card đã tạo có tự đổi không?
* Khi ảnh thay đổi, card đã tạo có tự đổi không?
* Khi tên sản phẩm được sửa, card cũ hiển thị tên mới hay snapshot cũ?
* Khi preset bị inactive, card đang sở hữu có bị ảnh hưởng không?

Khuyến nghị:

* Giữ snapshot financial data.
* Có thể lấy ảnh và display metadata mới từ catalog.
* Không tự sửa phí lịch sử.
* Có action riêng để đồng bộ snapshot khi người dùng yêu cầu.

### Definition of Done

* Có `docs/catalog-snapshot-policy.md`.
* API và UI thực hiện cùng một chính sách.
* Preset inactive không làm mất card hiện có.
* Annual fee thay đổi không âm thầm sửa dữ liệu lịch sử.
* Có test cho ít nhất một trường hợp catalog thay đổi.

---

# PHASE 5 — TESTING VÀ QUALITY GATES

## CC-030 — Bổ sung testing stack

**Ưu tiên:** P0
**Kích thước:** M
**Files:** `package.json`

### Todo

Bổ sung:

* Unit test runner.
* React component testing.
* API integration testing.
* E2E testing.
* Test database hoặc database isolation.
* Scripts:

```bash
npm run test
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Definition of Done

* `npm test` chạy được trên local và CI.
* Test không phụ thuộc production database.
* Test thất bại trả exit code khác 0.
* Có ít nhất một test mẫu cho mỗi tầng.
* Tài liệu có hướng dẫn chạy test.

---

## CC-031 — Viết unit test cho catalog và business logic

**Ưu tiên:** P0
**Kích thước:** M

### Todo

Test:

* `getPresetById`.
* Group theo provider.
* Filter active.
* Sort.
* Image fallback.
* Normalize owner.
* Format annual fee.
* Legacy fallback.
* Mapping migration.

### Definition of Done

* Các helper chính có test success và edge case.
* Duplicate preset được phát hiện.
* `annualFee: null` không làm crash.
* Sản phẩm inactive không xuất hiện trong picker.
* Test chạy ổn định, không phụ thuộc network.

---

## CC-032 — Viết integration test cho API

**Ưu tiên:** P0
**Kích thước:** L

### Todo

Test:

* GET providers.
* GET products by provider.
* GET product detail.
* POST card thành công.
* POST thiếu owner.
* POST preset không tồn tại.
* POST preset inactive.
* POST cố ghi đè annual fee.
* PUT field hợp lệ.
* PUT field identity bị chặn.
* GET cards gồm legacy và catalog card.
* Report gồm legacy và catalog card.

### Definition of Done

* Tất cả contract chính có integration test.
* Test xác nhận server là nguồn chân lý của product metadata.
* Test dọn dữ liệu sau khi chạy.
* Không phụ thuộc thứ tự chạy.
* CI chạy được toàn bộ integration test.

---

## CC-033 — Viết E2E test cho flow chính

**Ưu tiên:** P1
**Kích thước:** L

### Todo

Scenario chính:

1. Mở trang cards.
2. Mở modal thêm thẻ.
3. Chọn Sacombank.
4. Chọn Visa Platinum Cashback.
5. Nhập chủ thẻ.
6. Tạo card.
7. Card xuất hiện đúng provider section.
8. Mở detail.
9. Cập nhật thông tin thanh toán.
10. Quay lại listing.
11. Xác nhận dữ liệu còn đúng.

Scenario bổ sung:

* Validation owner.
* Mobile layout.
* Keyboard navigation.
* Xóa card.
* Mark paid.

### Definition of Done

* Flow chính chạy tự động.
* Có test ít nhất một viewport mobile và desktop.
* Test không dùng sleep cố định nếu có thể tránh.
* Screenshot hoặc trace được giữ khi test fail.
* Regression flow cũ được bao phủ.

---

## CC-034 — Kiểm thử đầy đủ edge cases

**Ưu tiên:** P1
**Kích thước:** M

### Todo

Bao phủ:

* Annual fee bằng 0.
* Annual fee là `null`.
* Image URL trống.
* Image URL hỏng.
* Data URI legacy.
* Card không có preset.
* Payment date trống.
* Statement date trống.
* Owner có khoảng trắng thừa.
* Cùng provider, cùng network nhưng khác product.
* Preset inactive.
* Provider không có sản phẩm active.
* Tên sản phẩm rất dài.
* Database mất kết nối.

### Definition of Done

* Mỗi edge case có expected behavior.
* UI không crash.
* API không trả response mơ hồ.
* Không có giá trị `NaN`, `undefinedđ` hoặc broken image.
* Các trường thiếu có fallback dễ hiểu.

---

## CC-035 — Bổ sung CI quality gates

**Ưu tiên:** P0
**Kích thước:** M
**Files:** `Jenkinsfile`, `Dockerfile`

### Todo

Pipeline chạy theo thứ tự:

1. Install dependencies.
2. Validate catalog.
3. Type check.
4. Lint.
5. Unit tests.
6. Integration tests.
7. Build.
8. Image preparation.
9. Container smoke test.

### Definition of Done

* Catalog lỗi làm pipeline fail.
* TypeScript lỗi làm pipeline fail.
* Unit hoặc integration test lỗi làm pipeline fail.
* Container build xong được khởi động smoke test.
* Generated image và manifest được cleanup đúng.
* Không deploy nếu quality gate thất bại.

---

# PHASE 6 — DEPLOYMENT VÀ VẬN HÀNH

## CC-036 — Xây dựng release plan tương thích ngược

**Ưu tiên:** P0
**Kích thước:** M

### Todo

Thứ tự rollout:

1. Backup MongoDB.
2. Deploy schema tương thích ngược.
3. Deploy API catalog.
4. Deploy API create mới.
5. Smoke test API.
6. Chạy migration dry-run.
7. Review kết quả.
8. Chạy migration apply.
9. Deploy UI catalog-first.
10. Smoke test listing, detail và report.
11. Theo dõi log.
12. Giữ rollback plan.

### Definition of Done

* Có release checklist.
* Có backup được xác nhận khôi phục được hoặc có quy trình restore rõ ràng.
* Migration dry-run được review trước apply.
* Code cũ không bị vỡ trong giai đoạn chuyển tiếp.
* Có rollback procedure.
* Có người xác nhận smoke test.

---

## CC-037 — Thêm smoke test sau deploy

**Ưu tiên:** P1
**Kích thước:** M

### Todo

Smoke test:

* `/cards` trả HTTP thành công.
* Catalog providers trả dữ liệu.
* Có thể đọc danh sách cards.
* Có thể mở một card detail.
* Report summary trả dữ liệu.
* Ảnh hoặc placeholder tải được.
* Database connection hoạt động.

### Definition of Done

* Smoke test chạy tự động sau container start.
* Fail smoke test không được đánh dấu deploy thành công.
* Output chỉ rõ endpoint lỗi.
* Không tạo dữ liệu rác trong production.
* Có timeout hợp lý.

---

## CC-038 — Bổ sung structured logging và observability

**Ưu tiên:** P2
**Kích thước:** M

### Todo

Log các event:

* Catalog load failure.
* Preset lookup failure.
* Card creation success/failure.
* Migration result.
* Image download failure.
* Validation failure.
* Database error.

Không log:

* Dữ liệu nhạy cảm không cần thiết.
* Toàn bộ request body nếu có thông tin cá nhân.
* Stack trace ra client.

### Definition of Done

* Log có timestamp, event code và context.
* Có thể tìm lỗi theo `presetId`.
* Có thể tìm lỗi theo card ID.
* Không log secret hoặc connection string.
* Production logs đủ để điều tra lỗi tạo card.

---

# PHASE 7 — SECURITY VÀ ACCESS CONTROL

## CC-039 — Bổ sung authentication

**Ưu tiên:** P1 nếu ứng dụng public hoặc nhiều người dùng
**Kích thước:** L

### Todo

* Chọn cơ chế đăng nhập.
* Bảo vệ route UI.
* Bảo vệ API mutation.
* Xác định owner của dữ liệu theo account.
* Không cho người dùng xem card của người khác.
* Bảo vệ masterdata routes.

### Definition of Done

* Người chưa đăng nhập không thể đọc dữ liệu thẻ riêng tư.
* Mutation API yêu cầu session hợp lệ.
* Dữ liệu card được lọc theo người dùng hoặc workspace.
* Test authorization có ít nhất hai user.
* Không dựa hoàn toàn vào việc ẩn nút ở frontend.

---

## CC-040 — Phân quyền quản trị catalog

**Ưu tiên:** P2
**Kích thước:** M

### Todo

Vai trò tối thiểu:

* User:

  * Xem catalog.
  * Tạo và quản lý User Card của mình.
* Admin:

  * Tạo/sửa/deactivate provider.
  * Tạo/sửa/deactivate Card Product.
  * Cập nhật annual fee và image URL.
  * Review nguồn dữ liệu.

### Definition of Done

* User thường không sửa được catalog.
* Admin endpoint kiểm tra role ở server.
* Preset bị deactivate không thể dùng để tạo card mới.
* Card cũ từ preset inactive vẫn sử dụng được.
* Có audit thông tin người cập nhật nếu catalog chuyển sang DB.

---

# PHASE 8 — DOCUMENTATION

## CC-041 — Viết lại README dự án

**Ưu tiên:** P1
**Kích thước:** M
**Files:** `README.md`

### Todo

README gồm:

* Mục tiêu ứng dụng.
* Kiến trúc.
* Tech stack.
* Cấu trúc thư mục.
* Biến môi trường.
* Cách chạy local.
* Cách chạy Docker.
* Cách seed dữ liệu.
* Cách thêm Card Product.
* Cách validate catalog.
* Cách chạy test.
* Migration.
* Deployment.
* Troubleshooting.

### Definition of Done

* README không còn boilerplate create-next-app.
* Thành viên mới có thể chạy project dựa trên README.
* Có ví dụ catalog entry.
* Có ví dụ payload API.
* Có cảnh báo không dùng production DB để test.

---

## CC-042 — Cập nhật metadata và branding

**Ưu tiên:** P2
**Kích thước:** S
**Files:** `app/layout.tsx`

### Todo

* Đổi title.
* Đổi description.
* Thêm favicon nếu có.
* Thêm application name.
* Đặt ngôn ngữ `vi`.
* Loại bỏ metadata mặc định của Next.js.

### Definition of Done

* Browser title đúng tên sản phẩm.
* Metadata không còn nội dung boilerplate.
* HTML language phù hợp.
* Build thành công.

---

# PHASE 9 — NÂNG CẤP KIẾN TRÚC TƯƠNG LAI

## CC-043 — Chuyển Card Catalog từ JSON sang MongoDB

**Ưu tiên:** P3
**Kích thước:** XL

### Todo

Tạo model:

```text
Provider
CardProduct
```

`CardProduct` gồm:

* Provider reference.
* Display name.
* Network.
* Segment.
* Annual fee.
* Image URL.
* Source URL.
* Source checked date.
* Active.
* Sort order.
* Version.
* Created/updated metadata.

Tạo seed từ `card-presets.json`.

### Definition of Done

* Catalog được đọc từ database.
* JSON có thể dùng làm seed hoặc backup.
* Có unique index cho product identifier.
* API catalog không phải thay contract.
* User Card hiện có không bị ảnh hưởng.
* Có migration và rollback.

---

## CC-044 — Tạo màn hình quản trị Card Product

**Ưu tiên:** P3
**Kích thước:** XL
**Route đề xuất:** `/masterdata/card-products`

### Todo

* Danh sách provider.
* Danh sách products theo provider.
* Tạo product.
* Sửa product.
* Deactivate product.
* Annual fee.
* Network.
* Image URL và preview.
* Source URL.
* Source checked date.
* Sort order.
* Data validation.

Không nhồi Card Product vào màn hình Banks hoặc Card Types hiện tại.

### Definition of Done

* Admin quản lý catalog mà không sửa source code.
* User thường không truy cập được.
* Không xóa cứng product đang được User Card tham chiếu.
* Có audit trail cơ bản.
* Validation giống API catalog.

---

## CC-045 — Làm rõ và dọn masterdata cũ

**Ưu tiên:** P3
**Kích thước:** M

### Todo

* `Bank` chỉ đại diện provider.
* `CardType` chỉ đại diện network.
* Card Product là entity riêng.
* Loại bỏ việc merge tùy tiện dữ liệu banks, cardtypes và presets trong cùng một dropdown.
* Cân nhắc rename UI `Card Types` thành `Card Networks`.

### Definition of Done

* Mỗi masterdata có đúng một trách nhiệm.
* UI không hiển thị lẫn network và product.
* Không có duplicate source of truth cho provider name.
* Tài liệu domain phản ánh đúng cấu trúc.

---

## CC-046 — Deprecate contract và field legacy

**Ưu tiên:** P3
**Kích thước:** L

### Todo

Chỉ thực hiện sau khi:

* Tất cả card cũ đã được migration hoặc đánh dấu legacy.
* Không còn consumer dùng POST contract cũ.
* Report đã dùng field mới.
* UI không phụ thuộc field cũ.

Sau đó:

* Ngừng nhận payload tạo card kiểu cũ.
* Đánh dấu field `bank/name/type` deprecated.
* Cân nhắc giữ snapshot tương thích hoặc rename rõ ràng.
* Không xóa dữ liệu trước khi backup và xác nhận.

### Definition of Done

* Có báo cáo usage trước khi loại bỏ.
* Không còn request contract cũ trong log trong thời gian theo dõi đã định.
* Migration hoàn tất.
* Regression tests vượt qua.
* Có rollback plan trước khi thay đổi schema phá vỡ tương thích.

---

# MỐC TRIỂN KHAI ĐỀ XUẤT

## Milestone 1 — Catalog foundation

Bao gồm:

* CC-001 đến CC-009.

Kết quả:

* Catalog chuẩn.
* Dữ liệu Sacombank đầy đủ.
* Có validation.
* Hình ảnh có fallback.

## Milestone 2 — Catalog-first backend

Bao gồm:

* CC-010 đến CC-016.

Kết quả:

* Có API catalog.
* Card được tạo bằng `presetId + owner`.
* Dữ liệu legacy vẫn hoạt động.

## Milestone 3 — Giao diện mới

Bao gồm:

* CC-017 đến CC-026.

Kết quả:

* Modal thêm thẻ mới.
* Listing flex responsive.
* Group theo provider.
* Detail và report hỗ trợ schema mới.

## Milestone 4 — Migration và testing

Bao gồm:

* CC-027 đến CC-035.

Kết quả:

* Dữ liệu cũ được migration an toàn.
* Có test unit, integration và E2E.
* CI có quality gate.

## Milestone 5 — Production hardening

Bao gồm:

* CC-036 đến CC-042.

Kết quả:

* Có rollout và rollback.
* Có smoke test.
* Có logging.
* Có auth nếu cần.
* Tài liệu hoàn chỉnh.

## Milestone 6 — Admin catalog tương lai

Bao gồm:

* CC-043 đến CC-046.

Kết quả:

* Catalog quản lý bằng database.
* Có màn hình admin.
* Masterdata được tách đúng domain.
* Contract legacy được loại bỏ có kiểm soát.

---

# GLOBAL DEFINITION OF DONE CHO TOÀN BỘ FEATURE

Feature catalog-first chỉ được xem là hoàn tất khi:

* Người dùng tạo card mới bằng cách chọn provider và Card Product.
* Người dùng chỉ cần nhập thông tin chủ thẻ.
* Server derive toàn bộ product metadata từ catalog.
* Sacombank có ít nhất:

  * Visa Platinum Cashback.
  * Platinum American Express®.
* Mỗi Card Product có:

  * Provider.
  * Display name.
  * Network.
  * Annual fee.
  * Image URL hoặc fallback.
  * Source URL.
  * Active status.
* Listing được group theo provider.
* Listing dùng flex responsive và không vỡ trên mobile.
* Detail và report hoạt động với cả card cũ và mới.
* Dữ liệu cũ không bị mất.
* Migration có dry-run.
* Catalog có validation tự động.
* API có validation và error handling.
* Unit, integration và E2E tests vượt qua.
* Lint và build vượt qua.
* Docker image build được.
* Jenkins pipeline vượt qua quality gates.
* Có backup, rollout và rollback plan.
* README mô tả đúng kiến trúc mới.
