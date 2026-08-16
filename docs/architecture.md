# Architecture — Card Credit

## 1. Architectural decision summary

Card Credit dùng mô hình **modular web application với frontend/backend tách
runtime nhưng cùng một public origin**:

- Next.js sở hữu UI, route rendering, browser clients và static assets.
- Fastify sở hữu toàn bộ `/api/**`, authentication, authorization, domain
  services, Mongoose models, health/readiness và background reminder scheduler.
- MongoDB là mutable runtime source of truth.
- Browser chỉ gọi relative `/api/**`; Next.js rewrite nội bộ tới backend, vì vậy
  không cần CORS hoặc expose backend URL.
- `shared/` chứa DTO/error contracts framework-free dùng cho cả hai runtime.

Quyết định này phù hợp với codebase hiện tại, giảm coupling giữa UI và database,
cho phép scale/rollback hai image độc lập và giữ public contract ổn định.

## 2. Logical architecture

### Frontend layer

- Next.js 16 App Router + React 19 + TypeScript.
- Server/client components cho dashboard, card list/detail, report, profile và
  admin console.
- Browser API clients chỉ dùng relative URL và parse error envelope.
- Middleware chỉ redirect theo dấu hiệu session; backend quyết định quyền thật.
- Tailwind/PostCSS và component primitives cho responsive UI.

### Backend layer

- Node.js 22 + Fastify 5 + TypeScript.
- Route adapters theo bounded capability: auth, card, transaction/statement,
  cashback, fee, report, calendar, workspace, user, catalog và masterdata.
- Domain/pure functions tách khỏi transport cho statement period, summary,
  cashback cap, reminder, calendar projection và validation.
- Mongoose models/repositories truy cập MongoDB.
- SMTP mail service dùng runtime configuration; scheduler chạy trong backend.

### Data layer

- MongoDB replica set/managed service cho production.
- Financial amounts là integer VND; dates là ISO date string theo business rule.
- Các document lịch sử giữ snapshot field cần thiết; catalog không tự động mutate
  card đã tạo.
- Index phục vụ workspace isolation, list, date range, due-date scan và unique
  idempotency.

### External services

- SMTP relay: gửi password reset/reminder/calendar email.
- Private calendar clients: đọc `.ics` feed bằng random token.
- Jenkins/company CI, Nexus container registry và GitOps/Argo CD: build, scan,
  publish và reconcile deployment.

## 3. Runtime topology

```text
                         +-----------------------------+
                         | Browser / Calendar client   |
                         +--------------+--------------+
                                        |
                     HTTPS, same-origin | relative /api/**
                                        v
                 +----------------------+----------------------+
                 | Public origin / ingress                    |
                 | Next.js frontend :3000                     |
                 | UI, middleware, rewrite, static assets     |
                 +----------------------+----------------------+
                                        |
                          internal HTTP | BACKEND_INTERNAL_URL
                                        v
                 +----------------------+----------------------+
                 | Fastify backend :3001                      |
                 | auth + RBAC + domain routes + scheduler    |
                 +-------------+----------------+--------------+
                               |                |
                       Mongoose|                | SMTP TLS
                               v                v
                 +-------------+------+   +-----+---------------+
                 | MongoDB             |   | SMTP relay          |
                 | users, cards,       |   | reminders/reset     |
                 | statements, reports |   +---------------------+
                 +--------------------+

 CI: source -> Jenkins validation/scans -> Nexus images -> GitOps repo
      -> Argo CD -> frontend/backend Kubernetes workloads
```

## 4. Request and authorization flow

1. Browser gửi request tới same-origin `/api/...`.
2. Next.js rewrite request tới backend trên private network.
3. Fastify browser-security hook kiểm tra Origin/Fetch Metadata đối với mutation.
4. Auth route đọc signed `card_credit_session` cookie; không tin user/role/workspace
   từ request body.
5. Route validate params/body/query, lấy `Session`, rồi query resource kèm
   `workspaceId`.
6. Domain function tính toán/kiểm tra state transition.
7. Repository/Mongoose ghi hoặc đọc MongoDB; mutation nhạy cảm ghi audit.
8. Response dùng JSON contract; lỗi đi qua centralized error handler.

## 5. Authentication and authorization

### Authentication

- Email/password hiện tại; password hash bằng service backend.
- Session là HMAC-signed payload chứa `userId`, email, role, workspace và issued
  time; secret tối thiểu 32 ký tự, chỉ có ở backend.
- Cookie: `HttpOnly; Secure; SameSite=Lax; Path=/`, host-only; logout clear cùng
  attributes.
- Password reset token random một lần; MongoDB chỉ lưu SHA-256 hash, có expiry và
  usedAt.
- Calendar token random, chỉ hiển thị một lần; MongoDB chỉ lưu hash, endpoint
  feed không dùng session cookie.

### Authorization

- `user`: domain read/write trong workspace.
- `admin`: các quyền của user + user management, catalog/masterdata mutation,
  audit log.
- Public: health/readiness và active catalog read (theo policy hiện tại).
- Token-only: private calendar feed.
- Mọi service/repository helper phải yêu cầu session/workspace hoặc resource đã
  được scope; không có query bare theo `_id` cho private resource.

## 6. Technology selection

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| UI/runtime | Next.js 16, React 19, TypeScript | App Router, production standalone image, type-safe UI và responsive SSR/client mix. |
| API/runtime | Fastify 5 trên Node.js 22 | Nhẹ, lifecycle/logging tốt, hợp với route hiện tại và dễ scale stateless. |
| Persistence | MongoDB + Mongoose | Schema linh hoạt cho catalog/legacy compatibility, document snapshot và index theo workspace/date. |
| Shared contract | Framework-free JS/TypeScript package | Tránh frontend import server code; giữ error/DTO contract đồng nhất. |
| Auth | HMAC session cookie + password hash | Same-origin browser flow, không lưu bearer token trong browser storage, đơn giản cho deployment hiện tại. |
| Email | Nodemailer + SMTP relay | Không khóa provider; credentials chỉ runtime backend; phù hợp reminder và reset. |
| Test | Node test runner, TypeScript tests, Playwright | Unit/domain, API/integration và critical browser journey. |
| Container | Multi-stage Docker, non-root runtime | Image nhỏ hơn, dependency/runtime tách biệt, giảm blast radius. |
| CI/CD | Jenkins + `ci-platform` + Nexus + `cd-platform`/GitOps/Argo CD | Repository `Jenkinsfile` khai báo intent; CI validate `shared` → `frontend` → `backend`, publish immutable images; CD chỉ cập nhật external GitOps repo. |

Các lựa chọn không dùng: PostgreSQL/ORM relational sẽ phù hợp khi cần ledger,
transactional reporting phức tạp hơn; hiện tại MongoDB giảm migration friction và
đã là source of truth. OAuth/OIDC có thể là phase tương lai khi cần SSO; không
đưa vào phase hiện tại vì chưa có identity provider và product scope chưa yêu cầu.

## 7. Module boundaries

```text
frontend/
  app/                 pages and route composition
  components/          reusable UI and forms
  lib/api/              browser API clients
  lib/cards/            client-safe calculation/presentation helpers
backend/src/
  auth*                identity, session, password, audit
  card-routes*         user cards and catalog snapshot
  transaction-routes*  transactions and statements
  report-routes*       report query/projection
  *cashback*/*fee*     independent financial sources
  calendar*            one-off email and private feed
  models/              persistence schema only
shared/
  src/                 transport-neutral error and DTO contracts
```

Models không được trở thành business service. Route không tự lặp lại công thức
tài chính; công thức phải nằm trong pure/domain module và được test độc lập.

## 8. Deployment and operations

- Local: frontend `3000`, backend `3001`, developer-owned non-production MongoDB.
- Compose rollback: chỉ publish frontend; backend chỉ expose trong network.
- Production target: Kubernetes workloads frontend/backend, Secret injection cho
  Mongo/auth/SMTP, immutable image tag và GitOps reconciliation.
- Readiness fail khi MongoDB chưa connected; liveness không phụ thuộc database.
- HPA/replica chỉ áp dụng sau benchmark; scheduler cần lease/idempotency khi có
  nhiều replica.
- Backup/restore MongoDB do operator/platform sở hữu; catalog import phải có
  dry-run, review và backup trước apply.

## 9. Architecture decisions and trade-offs

- **Same-origin rewrite**: tránh CORS và giảm lỗi cookie; đổi lại frontend cần
  proxy/rewrite đúng trong mọi môi trường.
- **Signed cookie thay JWT localStorage**: giảm XSS token persistence; đổi lại
  session payload phải giới hạn và rotation/expiry cần được harden.
- **Catalog snapshot**: bảo toàn lịch sử tài chính; đổi lại provider/product
  rename không tự lan xuống card cũ.
- **MongoDB document model**: linh hoạt và nhanh triển khai; đổi lại report lớn
  cần aggregate/index discipline và transaction boundary rõ ràng.
- **In-process reminder scheduler**: đơn giản cho deployment nhỏ; khi scale lớn
  cần tách worker/queue nhưng vẫn giữ `ReminderDelivery` idempotency.
