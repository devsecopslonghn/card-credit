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
