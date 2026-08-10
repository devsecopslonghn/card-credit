# Product definition — Card Credit

## 1. Phạm vi và giả định

`Application idea` trong yêu cầu ban đầu đang để placeholder. Tài liệu này lấy
README, domain model, API và UI hiện có trong repository làm nguồn sự thật. Sản
phẩm được hiểu là Card Credit: ứng dụng cá nhân hoặc nhóm nhỏ để quản lý thẻ
tín dụng, giao dịch, kỳ sao kê, nghĩa vụ thanh toán và hiệu quả cashback theo
workspace.

Đây là tài liệu định hướng sản phẩm cho bản production. Những phần đã tồn tại
trong codebase được ghi nhận là baseline; những phần còn lại nằm trong
implementation plan.

## 2. Vấn đề cần giải quyết

Người sử dụng nhiều thẻ tín dụng thường phải ghép thông tin từ ứng dụng ngân
hàng, email, lịch và bảng tính. Cách làm đó gây ra các vấn đề:

- Không có một nơi thống nhất để biết thẻ nào đang dùng, ai là chủ thẻ và quy
  tắc chốt sao kê/hạn thanh toán.
- Giao dịch, tiền hoàn từ đối tác, cashback ngân hàng và phí thẻ bị trộn lẫn,
  dẫn đến tính sai lợi ích thực tế.
- Khó nhận biết tổng dư nợ, khoản đến hạn, khoản đã thanh toán và khoản quá
  hạn.
- Thay đổi thông tin sản phẩm thẻ hoặc catalog có thể làm sai lịch sử nếu dữ
  liệu lịch sử không được snapshot.
- Nhắc hạn thanh toán và lịch cá nhân phải tiện dụng nhưng không được làm lộ
  dữ liệu tài chính ra ngoài workspace.

Card Credit giải quyết bằng mô hình giao dịch và sao kê có cấu trúc, tách dữ
liệu lịch sử khỏi catalog, tính toán minh bạch và cung cấp reminder/calendar
theo quyền truy cập.

## 3. Người dùng

### Người dùng chính

- **Card owner**: cá nhân sở hữu một hoặc nhiều thẻ, nhập giao dịch, theo dõi
  sao kê, đánh dấu thanh toán, ghi cashback và xem báo cáo.
- **Workspace user**: thành viên cùng workspace được chia sẻ dữ liệu thẻ theo
  mô hình hiện tại. Mọi truy vấn domain đều bị giới hạn bởi `workspaceId`.

### Người dùng quản trị

- **Workspace/admin operator**: quản lý người dùng, role, workspace, master
  data, Card Catalog và audit log.

### Tác nhân hệ thống

- **Reminder scheduler**: quét kỳ sao kê đến hạn và gửi email qua SMTP theo
  preference của thẻ.
- **Calendar consumer**: Apple Calendar, Google Calendar hoặc ứng dụng tương
  thích truy cập private `.ics` feed bằng token đã cấp.
- **Operator/CI-CD**: build, scan, deploy và rollback image; không phải người
  dùng nghiệp vụ.

## 4. Giá trị kinh doanh

- Giảm sai sót khi theo dõi nhiều thẻ và kỳ thanh toán.
- Giảm nguy cơ trễ hạn nhờ dashboard, email reminder và calendar feed.
- Cho phép phân biệt `service fee`, partner return, transaction cashback,
  bank-paid monthly cashback và card fee để biết lợi ích ròng thực tế.
- Bảo toàn lịch sử khi sản phẩm thẻ, phí hoặc catalog thay đổi.
- Tạo nền tảng dữ liệu có cấu trúc để mở rộng báo cáo, nhiều workspace hoặc
  tích hợp ngân hàng trong tương lai mà không phụ thuộc vào dữ liệu UI.

## 5. Các workflow chính

### 5.1 Onboarding và đăng nhập

1. Người dùng đăng ký bằng email, mật khẩu và tên hiển thị.
2. Hệ thống tạo user/session; user đầu tiên của database có thể được bootstrap
   thành admin theo policy hiện tại.
3. Người dùng đăng nhập, đăng xuất hoặc khôi phục mật khẩu qua reset token.
4. Backend phát hành signed HttpOnly session cookie; frontend không giữ token
   trong localStorage.

### 5.2 Khai báo và quản lý thẻ

1. Người dùng chọn Card Product đang active từ catalog.
2. Hệ thống snapshot provider, product name, network, annual fee và image vào
   User Card; dữ liệu vận hành gồm owner, statement day, due-day offset,
   cashback cap và reminder.
3. Người dùng xem, sửa thuộc tính vận hành, vô hiệu hóa hoặc xóa thẻ.
4. Legacy Card chưa có `presetId` vẫn được đọc và quản lý bằng compatibility
   fallback.

### 5.3 Nhập giao dịch và quản lý sao kê

1. Người dùng nhập ngày, số tiền chi, tiền đối tác hoàn, rate cashback, ghi chú
   và điều kiện tính phí thường niên.
2. Hệ thống tự xác định kỳ sao kê theo statement day, tạo kỳ nếu cần và gán
   giao dịch vào kỳ.
3. Hệ thống tính service fee, cashback đủ điều kiện, phần vượt cap, lợi nhuận
   kỳ vọng và tổng tiền phải trả.
4. Người dùng xem chi tiết kỳ, đóng kỳ, đánh dấu đã thanh toán hoặc mở lại theo
   state machine.
5. Giao dịch của kỳ `PAID` bị khóa; thay đổi sau đó chỉ qua workflow mở lại có
   chủ đích.

### 5.4 Theo dõi cashback và phí thẻ

1. Người dùng cập nhật trạng thái cashback từng giao dịch.
2. Người dùng ghi một bản ghi cashback ngân hàng theo tháng dương lịch, gồm số
   dự kiến, số thực nhận, trạng thái và ghi chú.
3. Khi ngân hàng thực tế thu phí, người dùng ghi `CardFeePayment`; phí được
   trừ trong lợi ích ròng thực tế nhưng không làm thay đổi dư nợ giao dịch.

### 5.5 Theo dõi hạn thanh toán

1. Dashboard tổng hợp dư nợ hiện tại, khoản đến hạn trong tháng và tháng tới.
2. User bật reminder, chọn ngày trước hạn, timezone và giờ gửi.
3. Scheduler claim delivery idempotently, gửi email SMTP và retry failure an
   toàn.
4. User có thể gửi một file `.ics` cho một kỳ hoặc tạo private feed subscription
   để ứng dụng lịch tự cập nhật.

### 5.6 Báo cáo và quản trị

1. Người dùng lọc báo cáo toàn thời gian, năm hoặc tháng theo owner/card.
2. Hệ thống hiển thị spending, service fee, transaction cashback đối chiếu,
   bank cashback, phí thẻ và actual net benefit; không cộng trùng cashback.
3. Admin quản lý user, masterdata, catalog product/provider và xem audit log.

## 6. Ranh giới sản phẩm

### In scope

- Quản lý nhiều thẻ trong workspace.
- Catalog product/provider và snapshot khi tạo card.
- Giao dịch, sao kê, trạng thái thanh toán, cashback và phí thẻ.
- Dashboard khoản phải trả, reminder email và calendar integration.
- Báo cáo lọc theo thời gian/owner/card và xuất JSON.
- Authentication, role authorization, workspace isolation, audit và vận hành
  production.

### Out of scope hiện tại

- Kết nối trực tiếp API ngân hàng hoặc tự động import giao dịch.
- Tự động thanh toán, chuyển tiền hoặc lưu số thẻ/CVV/OTP.
- Đồng bộ hai chiều với calendar; `.ics` là read-only.
- Tự động đồng bộ catalog snapshot vào card lịch sử.
- Hỗ trợ nhiều currency hoặc mô hình kế toán đầy đủ.

## 7. Chỉ số thành công

- 100% request private domain bị giới hạn bởi `workspaceId` và session hợp lệ.
- Người dùng có thể xác định tổng số tiền đến hạn và kỳ hạn trong tối đa 2 thao
  tác từ dashboard.
- Báo cáo `actualNetBenefit` không cộng trùng transaction cashback và bank
  cashback.
- Reminder delivery không gửi trùng cho cùng card/statement/days-before.
- Không mất dữ liệu nghiệp vụ khi catalog thay đổi hoặc deploy rollback.
- P95 response của read API thông thường dưới 500 ms với workspace dưới 10.000
  giao dịch; P95 report dưới 1,5 giây ở quy mô mục tiêu.

