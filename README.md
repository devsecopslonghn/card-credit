# Card Credit

Card Credit quản lý thẻ tín dụng, giao dịch, kỳ sao kê, cashback, ghi chú,
master data và Card Catalog theo workspace.

## Kiến trúc

- `frontend/`: Next.js 16 và React 19, chỉ chứa UI, browser clients và static assets.
- `backend/`: Fastify/TypeScript trên Node.js 22, sở hữu toàn bộ `/api/**`, auth,
  authorization, MongoDB models, domain services, health và readiness.
- `shared/`: contract API framework-free dùng chung giữa hai runtime.
- Browser chỉ gọi relative `/api/**`. Next rewrites sang `BACKEND_INTERNAL_URL`;
  production mặc định dùng `http://backend:3001` trong Compose.
- Frontend production image dùng Next.js standalone output, chỉ đóng gói traced
  runtime dependencies thay vì cài lại toàn bộ production dependency ở runner.
- MongoDB là runtime source of truth. `frontend/data/card-presets.json` chỉ là
  baseline được validate/import rõ ràng, không phải mutable runtime storage.

## Bảo mật

- Session cookie `card_credit_session` được ký HMAC, HttpOnly, Secure,
  SameSite=Lax, Path=/ và host-only.
- Backend kiểm tra session, role và workspace cho mọi API riêng tư.
- Production không bật CORS. Mutation cross-origin bị chặn bằng Origin và Fetch
  Metadata; không có credential wildcard.
- Password được hash, reset token chỉ lưu hash và audit không ghi secret.

## Chạy local

Chuẩn bị một MongoDB không phải production và secret tối thiểu 32 ký tự:

```bash
cd backend
npm ci
MONGODB_URI='mongodb://127.0.0.1:27017/card-credit-development' \
AUTH_SECRET='replace-with-at-least-32-characters' \
npm run dev
```

Trong terminal khác:

```bash
cd frontend
npm ci
BACKEND_INTERNAL_URL='http://127.0.0.1:3001' npm run dev
```

Mở `http://127.0.0.1:3000/register`. User đầu tiên của database được tạo với
role admin.

## Gửi lịch sao kê qua email

Tại chi tiết một kỳ sao kê đã lưu, người dùng có thể chọn
`Gửi lịch qua email`. Backend gửi một file `.ics` chỉ có hạn thanh toán tới
email đăng nhập hiện tại của tài khoản. Recipient luôn được đọc
lại từ tài khoản phía server; request không nhận email người nhận. File chỉ dùng
để nhập một lần vào ứng dụng lịch, không phải subscription hay đồng bộ liên tục.

Endpoint: `POST /api/cards/:cardId/statements/:statementId/calendar-email`.

## Lịch hạn thanh toán tự cập nhật

Trong trang Hồ sơ, người dùng có thể tạo URL lịch riêng tư với nhãn thiết bị,
sao chép URL một lần để đăng ký trên Apple Calendar hoặc ứng dụng tương thích,
và thu hồi URL khi không còn sử dụng. Feed read-only chỉ chứa hạn thanh toán của
các kỳ sao kê persisted chưa thanh toán thuộc các thẻ gắn trực tiếp với tài khoản
trong workspace hiện tại. Backend chỉ lưu hash của token; URL đầy đủ không thể
được xem lại sau khi rời màn hình tạo.

Mỗi event bắt đầu lúc 00:00 trước hạn ba ngày và kết thúc lúc 17:00 ngày đến
hạn theo timezone của thẻ. Feed kèm display alarm khi event bắt đầu, lúc 09:00
và 15:00 ngày đến hạn; ứng dụng lịch quyết định có chấp nhận alarm từ
subscription hay không.

Backend cần `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_ADDRESS` và
có thể nhận `SMTP_PORT`, `SMTP_SECURE`. `SMTP_HOST=host:port` được hỗ trợ tạm
thời; port riêng có ưu tiên và mặc định là 587. Các biến này chỉ được inject vào
backend lúc chạy, không dùng `NEXT_PUBLIC_` hoặc Docker build arguments.

Scheduler reminder dùng `REMINDER_SCAN_INTERVAL_MS` (mặc định 60000 ms) và
`REMINDER_CLAIM_TIMEOUT_MS` (mặc định 300000 ms). Claim quá timeout có thể được
worker khác phục hồi; delivery thành công hoặc skip an toàn không được reclaim.

## Cashback ngân hàng và báo cáo

Trang chi tiết thẻ cho phép ghi cashback ngân hàng độc lập theo tháng dương
lịch, gồm số dự kiến, trạng thái chờ nhận/đã nhận/bị từ chối, số thực nhận và
ghi chú. Khoản này không làm giảm dư nợ và không thay thế tiền đối tác hoàn hoặc
cashback ước tính trên giao dịch.

Trang `/reports` tổng hợp hiệu quả toàn thời gian, theo năm hoặc theo tháng, có
filter chủ thẻ và từng thẻ. KPI “cashback thực nhận” dùng cashback ngân hàng
theo tháng; cashback giao dịch chỉ hiển thị để đối chiếu và không cộng trùng.
Người dùng chỉ nhập `Phí thẻ đã đóng` khi ngân hàng thực tế thu phí; không cần
khai báo chu kỳ hoặc bản ghi được miễn. Lợi ích ròng thực tế bằng cashback ngân
hàng thực nhận trừ phí dịch vụ giao dịch và phí thẻ đã đóng. Nút `Xuất JSON`
sử dụng cùng filter đang chọn.

Kubernetes inject SMTP environment trực tiếp từ Secret `card-credit-runtime`
vào backend. Jenkins không nhận MongoDB, auth hoặc SMTP runtime secrets. Không
in các giá trị này trong log. Smoke test SMTP thủ công chỉ nên gửi một thư tới
tài khoản test đã được phê duyệt.

## Container and deployment

The repository builds separate frontend and backend images with the Dockerfiles
used by Jenkins/GitOps. Local validation should use the npm commands below; the
application no longer maintains a Docker Compose environment.

```bash
docker build -f frontend/Dockerfile -t card-credit-frontend:local .
docker build -f backend/Dockerfile -t card-credit-backend:local .
```

MongoDB, auth and SMTP credentials are injected by the deployment environment.
Do not use production credentials for local tests.

## Validation

```bash
cd shared && npm ci && npm test
cd ../backend && npm ci && npm run validate
cd ../frontend && npm ci && npm run typecheck && npm run lint && npm test && npm run build
```

## MCP remote server

The backend exposes a remote Streamable HTTP MCP endpoint at `/mcp` for
OpenClaw with Codex. It uses a fixed user/workspace and does not implement
login or multi-user access.

Required runtime variables are `MONGODB_URI`, `AUTH_SECRET`, `MCP_USER_ID`,
`MCP_WORKSPACE_ID`, `MCP_HTTP_TOKEN`, and `MCP_PREVIEW_SECRET`. Requests must
send `Authorization: Bearer <MCP_HTTP_TOKEN>`.

## API documentation

Swagger UI is available at `/docs`; the OpenAPI JSON is available at
`/docs/json`. The document covers REST endpoints and MCP tools. Set
`API_DOCS_ENABLED=false` to disable it.

Jenkins dùng Kubernetes agent và rootless BuildKit, build cả frontend/backend
image với cùng immutable Git SHA, push lên Nexus và cập nhật image tag trong repo
GitOps. Hai Dockerfile thực thi validation tương ứng trong build stages. Jenkins
không deploy trực tiếp; Argo CD đọc Helm chart và reconcile Kubernetes.

## Catalog import

Backend import dry-run mặc định:

```bash
cd backend
MONGODB_URI='mongodb://127.0.0.1:27017/card-credit-development' npm run import:catalog
```

Sau khi review và backup database:

```bash
MONGODB_URI='mongodb://127.0.0.1:27017/card-credit-development' npm run import:catalog -- --apply
```

Production cần thêm override có chủ đích `ALLOW_PRODUCTION_CATALOG_IMPORT=true`.
Xem [tài liệu kiến trúc và vận hành](docs/README.md) cùng
[implementation plan](docs/implementation-plan.md).
