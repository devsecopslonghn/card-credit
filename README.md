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

Jenkins hiện kế thừa SMTP environment trực tiếp từ agent và Compose chuyển tiếp
vào backend. Không in các giá trị này trong log. Smoke test SMTP thủ công chỉ
nên gửi một thư tới tài khoản test đã được phê duyệt. Phase sau nên chuyển
secrets sang Jenkins Credentials mà không đổi contract environment của backend.

## Docker Compose production

Build và chạy hai image từ repository root:

```bash
MONGODB_URI="$MONGODB_URI" \
AUTH_SECRET="$AUTH_SECRET" \
DOCKER_TAG=local \
docker compose -f docker-compose.prod.yml build

APP_PORT=8080 \
MONGODB_URI="$MONGODB_URI" \
AUTH_SECRET="$AUTH_SECRET" \
DOCKER_TAG=local \
docker compose -f docker-compose.prod.yml up -d --wait
```

Chỉ frontend được publish. Backend port 3001 chỉ nằm trong Compose network.
Backend `/health` kiểm tra liveness và `/ready` yêu cầu MongoDB connected.

## Test cô lập

`docker-compose.test.yml` thêm MongoDB 8 trên `tmpfs`; không publish database và
không lưu dữ liệu sau teardown. Không dùng production MongoDB cho test, seed,
import, migration hoặc E2E.

```bash
APP_PORT=18080 \
AUTH_SECRET='01234567890123456789012345678901' \
MONGODB_URI='mongodb://example.invalid/unused' \
DOCKER_TAG=local \
docker compose -p card-credit-test \
  -f docker-compose.prod.yml -f docker-compose.test.yml up -d --wait

cd frontend
PLAYWRIGHT_EXTERNAL_SERVER=true \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:18080 \
npx playwright test tests/e2e/split-runtime.spec.ts --project=desktop
```

Teardown:

```bash
docker compose -p card-credit-test \
  -f docker-compose.prod.yml -f docker-compose.test.yml \
  down --volumes --remove-orphans
```

## Validation

```bash
cd shared && npm ci && npm test
cd ../backend && npm ci && npm run validate
cd ../frontend && npm ci && npm run typecheck && npm run lint && npm test && npm run build
```

Jenkins giữ clean checkout, chạy backend validation bằng UID/GID của agent,
build cả frontend/backend image với cùng tag, deploy Compose trên master, kiểm tra
frontend cùng backend liveness/readiness và cleanup cả hai temporary images.

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
Xem [tài liệu kiến trúc](docs/README.md) và
[implementation plan đã hoàn tất](docs/plans/archive/2026-07-11-split-frontend-backend.md).
