# Card Credit

Card Credit la ung dung Next.js de quan ly the tin dung ca nhan: danh sach the, ngay sao ke, han thanh toan, so tien can tra, du lieu chi tieu theo thang, ghi chu lich va Card Catalog dung de tao the theo preset ngan hang.

## Muc Tieu

- Tao User Card tu Card Catalog theo contract `presetId + owner`.
- Luu snapshot thong tin san pham tai thoi diem tao the de card cu khong bi thay doi khi catalog cap nhat.
- Theo doi cac truong van hanh cua tung the: chu the, ngay sao ke, han thanh toan, so tien can tra, trang thai da thanh toan va monthly data.
- Bao ve du lieu rieng theo session va workspace.
- Ho tro catalog validation, migration, E2E va smoke test cho deploy.

## Kien Truc

- `app/`: Next.js App Router, UI pages va API routes.
- `components/cards/`: card list, modal tao the, picker provider/product va controls lien quan.
- `lib/api/`: route core co the test bang dependency injection.
- `lib/services/`: domain service tao/cap nhat User Card.
- `lib/cards/`: serializer, UI helpers va accessibility helpers.
- `lib/auth/`: session cookie HMAC va role helpers.
- `lib/catalog/`: store cho admin catalog JSON.
- `models/`: Mongoose models.
- `data/`: Card Catalog JSON va image manifest.
- `scripts/`: validate catalog, migrate, seed, cache images va smoke test.
- `tests/`: unit/integration tests bang `node:test`; `tests/e2e/` dung Playwright.
- `docs/`: roadmap, current behavior, release plan va snapshot policy.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Mongoose/MongoDB
- Playwright E2E
- Node.js `node:test`
- Docker/Jenkins pipeline

## Bien Moi Truong

```bash
MONGODB_URI="mongodb connection string"
AUTH_SECRET="long random secret for signed auth cookies"
AUTH_USERS_JSON='[
  {"email":"user@example.test","password":"change-me-123","role":"user","workspaceId":"workspace-1","displayName":"Local User"},
  {"email":"admin@example.test","password":"change-me-123","role":"admin","workspaceId":"admin-workspace","displayName":"Local Admin"}
]'
```

`AUTH_SECRET` bat buoc trong production. Neu thieu o local, app dung dev fallback de tien chay thu.
`AUTH_USERS_JSON` chi dung cho seed/bootstrap local hoac staging, khong duoc dung lam nguon dang nhap runtime. Sau khi seed, login doc user tu collection `users` va so sanh password bang hash.

Khong dung production MongoDB cho test, seed, migration dry-run hoac Playwright. Dung database rieng cho local/staging.

## Chay Local

```bash
npm install
npm run seed:auth-users
npm run dev
```

Mo `http://localhost:3000/cards`.

Dang nhap bang user da seed vao MongoDB tu `AUTH_USERS_JSON`. Cac route UI rieng tu nhu `/cards` va `/masterdata/**` yeu cau cookie session.

## Chay Docker

Build image:

```bash
docker build -t card-credit:local .
```

Chay container:

```bash
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGODB_URI="$MONGODB_URI" \
  -e AUTH_SECRET="$AUTH_SECRET" \
  card-credit:local
```

Voi compose production:

```bash
APP_PORT=8080 MONGODB_URI="$MONGODB_URI" AUTH_SECRET="$AUTH_SECRET" docker compose -f docker-compose.prod.yml up -d
```

## Auth Va Phan Quyen

- Session duoc luu trong cookie `card_credit_session`, signed bang HMAC SHA-256.
- User dang nhap duoc doc tu MongoDB collection `users`; password chi luu dang `passwordHash`.
- `AUTH_USERS_JSON` chi dung cho `npm run seed:auth-users` khi bootstrap local/staging.
- User thuong duoc xem catalog va quan ly User Card trong workspace cua minh.
- Admin duoc dung API admin catalog va masterdata mutation.
- API cards/reports/notes filter theo `workspaceId`.
- Mutation API kiem tra session o server, khong chi an nut tren frontend.

Auth endpoints:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Card Catalog

Nguon catalog hien tai:

- `data/card-presets.json`
- `data/card-image-manifest.json`
- `lib/cardCatalogCore.mjs`

Vi du catalog entry:

```json
{
  "presetId": "sacombank-visa-platinum-cashback",
  "providerCode": "STB",
  "providerName": "Sacombank",
  "displayName": "Visa Platinum Cashback",
  "network": "Visa",
  "segment": "Platinum",
  "annualFee": 599000,
  "targetSpendForWaiver": 100000000,
  "imageUrl": "/card-images/placeholder-card.svg",
  "benefits": ["Hoan tien theo dieu kien chuong trinh"],
  "sourceUrl": "https://www.sacombank.com.vn/",
  "sourceCheckedAt": "2026-07-05",
  "active": true,
  "sortOrder": 301,
  "theme": { "background": "#111827", "accent": "#f8fafc" },
  "id": "sacombank-visa-platinum-cashback",
  "bank": "STB",
  "bankName": "Sacombank",
  "name": "Visa Platinum Cashback",
  "type": "Visa"
}
```

Legacy aliases tam thoi phai khop canonical fields:

```text
id = presetId
bank = providerCode
bankName = providerName
name = displayName
type = network
```

Inactive products van nam trong catalog de giu lich su nhung khong xuat hien trong picker va khong tao duoc card moi.

## Catalog API

Read-only endpoints chi tra active products:

```text
GET /api/card-catalog/providers
GET /api/card-catalog/products
GET /api/card-catalog/products?provider=STB
GET /api/card-catalog/products/:presetId
```

Admin endpoints yeu cau role `admin`:

```text
GET   /api/admin/card-catalog/products
POST  /api/admin/card-catalog/products
PATCH /api/admin/card-catalog/products/:presetId
PATCH /api/admin/card-catalog/providers/:providerCode
```

Admin catalog update validate toan bo `data/card-presets.json` truoc khi ghi va response co audit:

```json
{
  "audit": {
    "updatedBy": "admin@example.test",
    "updatedByUserId": "admin-1",
    "updatedAt": "2026-07-05T00:00:00.000Z",
    "storage": "data/card-presets.json"
  }
}
```

## Card API

Tao card theo catalog-first contract:

```json
{
  "presetId": "sacombank-visa-platinum-cashback",
  "owner": "Long Ho"
}
```

Server resolve metadata tu catalog, snapshot canonical fields (`presetId`, `providerCode`, `providerName`, `displayName`, `network`) va legacy fields (`bank`, `name`, `type`, `imageUrl`, `annualFee`). Client overrides nhu `annualFee`, `imageUrl`, `providerName`, `displayName`, `network` bi bo qua khi tao card tu preset.

Legacy `POST /api/cards` van tam ho tro, duoc allowlist va tra header:

```text
X-Deprecated-Contract: legacy-card-create
```

`PUT /api/cards/:id` chi nhan operational fields:

```text
owner
targetSpendForWaiver
statementDate
paymentDueDate
amountDueThisMonth
isPaidThisMonth
monthlyData
```

Vi du loi API:

```json
{
  "error": {
    "code": "INVALID_OWNER",
    "message": "Ten chu the khong hop le.",
    "fields": {
      "owner": "Ten chu the khong duoc de trong."
    }
  }
}
```

## Seed Du Lieu

Seed auth user local/staging tu `AUTH_USERS_JSON`:

```bash
MONGODB_URI="mongodb connection string" AUTH_USERS_JSON='[
  {"email":"user@example.test","password":"change-me-123","role":"user","workspaceId":"workspace-1"},
  {"email":"admin@example.test","password":"change-me-123","role":"admin","workspaceId":"admin-workspace"}
]' npm run seed:auth-users
```

Script se hash `password` truoc khi ghi DB. Neu da co hash san, co the dung `passwordHash` thay cho `password`. Script tu choi chay voi `NODE_ENV=production` tru khi dat `ALLOW_PRODUCTION_AUTH_SEED=true`.

Seed sample data vao database local/staging:

```bash
MONGODB_URI="mongodb connection string" npm run seed:sample
```

Khong chay seed vao production DB neu chua duoc phe duyet ro rang.

## Them Card Product

1. Them entry vao `data/card-presets.json` bang canonical fields.
2. Dong bo legacy aliases trong thoi gian UI con can compatibility.
3. Dung `annualFee: null` neu chua xac minh duoc phi.
4. Dung `active: false` cho san pham ngung mo moi.
5. Ghi `sourceUrl` va `sourceCheckedAt`.
6. Chay `npm run validate:catalog` va `npm test`.

Co the dung admin API neu dang chay server voi admin session; API se validate truoc khi ghi JSON.

## Validate Catalog

```bash
npm run validate:catalog
```

Validation kiem tra duplicate `presetId`, alias mismatch, provider code, network, annual fee, `active`, `sortOrder`, source URL/date va image fallback.

## Test

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm test
npm run test:e2e
npm run build
```

Playwright dung mocked API cho catalog/card flows, khong can external network hay MongoDB. Trace, screenshot va video duoc giu khi test fail theo `playwright.config.ts`.

Baseline hien tai: `npm run lint` pass nhung con warning `<img>` cua Next.js trong UI hien co.

## Migration

Preview mapping truoc khi ghi:

```bash
MONGODB_URI="mongodb connection string" npm run migrate:catalog -- --dry-run
```

Ghi report:

```bash
npm run migrate:catalog -- --dry-run --output migration-report.json
```

Apply chi cap nhat exact matches:

```bash
MONGODB_URI="mongodb connection string" npm run migrate:catalog -- --apply
```

Backup database truoc apply. Migration idempotent, bo qua card da co `presetId`, va khong thay doi snapshot tai chinh nhu `annualFee`, `imageUrl`, owner, payment fields hoac `monthlyData`.

## Card Images

Cache remote images:

```bash
npm run prepare:card-images
```

Script ghi `data/card-image-manifest.json`. Anh thieu, remote fail hoac URL khong hop le fallback ve:

```text
/card-images/placeholder-card.svg
```

## Deployment

Checklist toi thieu:

```bash
npm install
npm run validate:catalog
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Smoke test sau deploy:

```bash
SMOKE_BASE_URL="https://your-app.example" npm run smoke:deploy
```

Jenkinsfile hien chay catalog validation, tests, build, Docker smoke va deploy smoke. Xem `docs/release-plan.md` de biet rollback, backup MongoDB va manual verification.

## Troubleshooting

- `Vui long dinh nghia bien MONGODB_URI`: API route can database nhung env thieu.
- `AUTH_SECRET is required in production`: them `AUTH_SECRET` khi `NODE_ENV=production`.
- Login that bai: kiem tra da chay `npm run seed:auth-users`, user `active` va khong co `lockedAt`, email/password dung.
- `/cards` redirect ve `/login`: chua co cookie session hop le.
- `PRESET_INACTIVE`: product inactive khong tao duoc card moi; card snapshot cu van render.
- Playwright khong co browser: chay `npx playwright install chromium`.
- Catalog validation fail: sua `data/card-presets.json`, nhat la alias, duplicate sortOrder/source date/image URL.
- Khong test bang production DB; tao database local/staging rieng cho seed, migration va regression.
