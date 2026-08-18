# Requirements — Card Credit

## 1. Giả định chung

- Tiền tệ mặc định là VND; số tiền lưu dưới dạng integer, không dùng floating
  point.
- Ngày nghiệp vụ lưu dạng `YYYY-MM-DD`; tháng cashback dạng `YYYY-MM`.
- Một user thuộc một workspace trong phiên hiện tại; session là nguồn xác định
  `userId`, `role` và `workspaceId`, không tin các field tương ứng từ browser.
- MongoDB là runtime source of truth. JSON catalog trong repository chỉ là
  baseline/recovery input qua command có review.

## 2. Functional requirements

### FR-01 — Identity and session

- User có thể register, login, logout, xem session hiện tại, forgot password và
  reset password.
- Email được normalize lowercase; password tối thiểu 8 ký tự và phải hash.
- Session cookie phải HttpOnly, Secure, SameSite=Lax, host-only và có giới hạn
  thời gian hợp lý.
- Login failure không tiết lộ email có tồn tại hay không.
- Admin có thể bootstrap user theo cơ chế token cấu hình; endpoint không được
  hoạt động nếu thiếu token hợp lệ.

### FR-02 — Workspace and authorization

- Mỗi bản ghi domain có `workspaceId` hoặc được truy cập qua resource đã kiểm
  tra workspace.
- User chỉ đọc/ghi card, transaction, statement, note, report, cashback,
  fee và calendar subscription trong workspace của session.
- Admin mới được quản lý user, role, Card Catalog write, masterdata write và
  audit log.
- Public registration tạo workspace cô lập theo email chuẩn hóa; client không
  được tự chọn `workspaceId`. Chỉ admin mới được chuyển user sang workspace
  khác qua policy quản trị.
- Backend là nơi enforce authorization; middleware frontend chỉ là UX guard.

### FR-03 — Card Catalog and user cards

- Public catalog có thể list provider active, list product theo provider và xem
  product detail.
- Admin có thể tạo/cập nhật product, đổi provider name/active; validation phải
  kiểm tra toàn catalog và ghi audit.
- User có thể tạo card từ product active; sản phẩm snapshot vào User Card.
- User có thể list/detail/update/delete card, lọc owner và xử lý exact duplicate
  qua preview/list rồi merge có chủ đích.
- Product inactive không dùng để tạo card mới nhưng card lịch sử vẫn hiển thị.
- Legacy card không có `presetId` vẫn hợp lệ.

### FR-04 — Transaction and statement

- User có thể tạo, sửa, xóa transaction với validation số tiền/rate/ngày.
- Hệ thống gán transaction theo quy tắc `previousStatementDate < date <=
  currentStatementDate` và tự tạo statement nếu cần.
- Statement lưu snapshot `statementDay` và `paymentDueDays`, để thay đổi config
  card không làm thay đổi lịch sử.
- Hệ thống tính summary: total due, service fee, eligible cashback, exceeded
  cashback, expected net profit và annual-fee eligible spend.
- Statement có state `OPEN`, `STATEMENT_CLOSED`, `PAID`; `OVERDUE` là trạng thái
  hiệu dụng dựa trên due date của kỳ chưa trả.
- `PAID` khóa mutation transaction; reopen phải xóa paid metadata và đưa kỳ về
  `STATEMENT_CLOSED`.

### FR-05 — Payment visibility and reminders

- Dashboard và report phải liệt kê toàn bộ khoản nợ theo từng kỳ sao kê, kể cả
  kỳ đã `PAID`. Mỗi row phân biệt rõ `grossDebt` (tổng phát sinh), `paidDebt`
  (đã thanh toán) và `outstandingDebt` (còn phải trả).
- Dashboard hiển thị tổng dư nợ chưa paid có due date không vượt quá hôm nay,
  tổng đến hạn trong tháng hiện tại và tháng kế tiếp.
- User có thể bật/tắt reminder theo card, chọn `daysBefore`, timezone và send
  time.
- Scheduler tạo delivery duy nhất theo statement và `daysBefore`, claim có
  timeout, retry lỗi và skip nếu kỳ đã paid hoặc preference không còn hợp lệ.
- Email recipient lấy từ user server-side; request không được cung cấp recipient.

### FR-06 — Cashback and card fee

- User có thể cập nhật cashback transaction sang `PENDING`, `RECEIVED` hoặc
  `REJECTED`; `RECEIVED` có actual amount hợp lệ.
- User có thể upsert một monthly bank cashback duy nhất cho mỗi card/tháng.
- `RECEIVED` yêu cầu actual amount; status khác không dùng actual amount để tính
  thực nhận.
- User có thể create/update/delete card fee payment thực tế; không tạo record
  cho fee waived hoặc chưa bị thu.
- Các nguồn cashback và fee không được làm thay đổi outcome amount/statement
  debt.

### FR-07 — Calendar integration

- User có thể request một lần file `.ics` của statement, chỉ chứa payment due
  event, gửi tới email đăng nhập.
- User có thể tạo private calendar subscription với device label, xem metadata
  không chứa token, và revoke subscription.
- Raw feed token chỉ trả về một lần; database chỉ lưu hash.
- Feed read-only chỉ chứa payment due của unpaid statements thuộc các card
  trực tiếp trong workspace/user scope được định nghĩa.

### FR-08 — Reports and notes

- Report hỗ trợ all-time, calendar year, calendar month, owner và card filter.
- Matching cards vẫn xuất hiện với zero totals nếu không có activity trong range.
- KPI gồm service fee, transaction cashback đối chiếu, monthly bank cashback
  expected/actual/rejected, paid card fee và actual net benefit.
- Runtime contract hiện cung cấp các KPI trên với `from/to` hoặc calendar
  `year/month`, cùng `owner` và `card` filter; REST, MCP và frontend dùng chung
  schema/range resolver và giữ matching cards với zero totals.
- `FinancialReportDto.creditDebtLedger` là projection canonical dùng chung cho
  REST, MCP và UI; không được loại bỏ row chỉ vì statement đã thanh toán.
- User có thể export JSON theo đúng filter đang chọn.
- User có thể upsert/xóa note theo ngày; note rỗng được coi là delete.

### FR-09 — Admin operations

- Admin list/update user display name, role, workspace; không được đổi email,
  password hash hoặc trạng thái ngoài policy endpoint.
- Admin CRUD legacy masterdata banks/cardtypes.
- Admin xem audit logs có filter và giới hạn số bản ghi.
- Catalog import phải mặc định dry-run, hiển thị create/update/unchanged/conflict;
  apply production cần explicit override và backup/review trước.

### FR-10 — Observability and lifecycle

- `/health` chỉ kiểm tra process liveness; `/ready` chỉ trả healthy sau khi
  MongoDB connected.
- Log có request id, event, method, path, status, duration; redact cookie,
  token, password, auth secret và Mongo URI.
- SIGTERM/SIGINT dừng scheduler, đóng HTTP và disconnect MongoDB trong timeout.

## 3. Business rules bắt buộc

```text
serviceFee = outcomeAmount - incomeAmount
cashbackByRate = outcomeAmount * cashbackRateBps / 10000
eligibleCashback = min(cashbackByRate, remaining cap)
expectedNetProfit = eligibleCashback - serviceFee
actualNetBenefit = monthlyBankCashbackActual - totalServiceFee - totalPaidCardFees
```

- `outcomeAmount > 0`.
- `0 <= incomeAmount <= outcomeAmount`.
- Các rate basis point nằm trong `[0, 10000]`.
- Cashback cap của `STATEMENT` reset theo từng statement; actual cashback không
  giải phóng cap.
- `statementDate` clamped vào ngày cuối tháng nếu statement day không tồn tại.
- Unique statement key: `workspaceId + userCardId + statementDate`.
- Unique monthly cashback key: `workspaceId + userCardId + period`.

## 4. Non-functional requirements

### NFR-01 — Performance

- P95 read API thông thường < 500 ms ở tải mục tiêu; P95 report < 1,5 s.
- List endpoint phải sort/filter bằng index, không load toàn bộ workspace nếu có
  pagination ở phase mở rộng.
- Dashboard/detail ưu tiên một request aggregate hoặc batch thay vì N+1 request.
- Email/calendar generation không được block request quá mức; SMTP lỗi phải
  trả lỗi nghiệp vụ rõ ràng và có log correlation.

### NFR-02 — Security and privacy

- Không lưu PAN, CVV, OTP, bank credential hoặc secret integration trong domain.
- Password hash, reset token hash, calendar token hash; raw secret không log.
- Same-origin rewrite, không bật CORS credential wildcard; mutation kiểm tra
  Origin/Fetch Metadata theo policy.
- Tất cả private route authenticate; mọi resource query kèm workspace filter.
- Input validation tại boundary; Mongo ObjectId, date, amount, enum và text
  length đều được kiểm tra.
- Admin mutation có audit actor/action/resource; production secrets chỉ inject
  runtime.

### NFR-03 — Availability and recoverability

- Backend có liveness/readiness riêng và frontend chỉ publish public origin.
- Container restart policy và graceful shutdown phải bật.
- MongoDB phải có backup, restore drill và retention do deployment environment
  quy định; application không tự ý dùng production cho test/import.
- Deploy rollback được bằng cặp image tag frontend/backend trước đó.
- Reminder delivery và catalog import phải idempotent hoặc có dry-run/guard.

### NFR-04 — Scalability

- Backend stateless ngoài MongoDB và delivery records; có thể scale nhiều replica.
- Reminder claim bằng unique key/lease để tránh gửi trùng khi scale.
- Catalog image URL/local manifest và feed query phải giới hạn payload; report có
  thể chuyển sang aggregate/materialized summary khi dữ liệu tăng. Server-side
  `cardproductimages` cache là legacy, không còn runtime owner.
- Target initial: 100 workspace, 1.000 user, 100.000 card transaction, 3 backend
  replica; cần benchmark trước khi mở rộng.

### NFR-05 — Maintainability and quality

- TypeScript cho frontend/backend, shared contracts framework-free.
- Pure domain calculations phải có unit test; route/security flows có integration
  test; critical journeys có Playwright E2E.
- Lint, typecheck, test, build, catalog validation và image security scan chạy
  trong CI.
- Tài liệu architecture/API/database được cập nhật cùng thay đổi contract.
- Không dual-write dài hạn; migration có version, backward compatibility và
  rollback plan.

### NFR-06 — Accessibility and localization

- UI hỗ trợ keyboard, focus visible, semantic labels, error announcement và
  responsive desktop/mobile.
- Ngôn ngữ mặc định tiếng Việt; date/time hiển thị theo timezone của card/user,
  lưu canonical ISO date.
- Màu trạng thái không phải tín hiệu duy nhất; có text/badge rõ ràng.

## 5. Acceptance baseline

- Unit/integration/E2E hiện có phải tiếp tục pass sau mỗi milestone.
- Không có private endpoint nào trả data ngoài workspace trong authorization test.
- Statement/payment/cashback/report fixtures chứng minh đúng các formula ở trên.
- Production image chạy non-root, readiness failure được nhận diện và secret
  không xuất hiện trong log hoặc client bundle.
