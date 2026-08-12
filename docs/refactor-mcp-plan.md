# Refactor Plan — Service Boundary and MCP

## Goal

Tách business logic khỏi REST route handlers, sau đó thêm MCP read-only dùng
chung Service Layer. Giữ nguyên REST contract, dữ liệu hiện có và hành vi UI.

## Target boundary

```text
REST route / MCP tool
        -> auth + validated input
        -> service + trusted ServiceContext
        -> domain functions
        -> repository/model
        -> DTO
```

```text
backend/src/
  services/
    types/                 # ServiceContext và DTO dùng chung
    card-service.ts
    statement-service.ts
    transaction-service.ts
    report-service.ts
  mcp/
    server.ts              # local stdio entrypoint
    context.ts              # server-owned identity/workspace context
    tools/                  # read-only tools trước
```

Không bắt buộc đổi tên toàn bộ file route/model hiện tại ở phase đầu. Ưu tiên
extract từng vertical slice từ code đang chạy.

## Phase 1 — Service boundary

### Scope

- Inventory logic trong `card-routes.ts`, `transaction-routes.ts`,
  `report-routes.ts`, cashback/fee routes.
- Tạo `ServiceContext` gồm trusted `workspaceId`, `userId`, role nếu cần.
- Tạo DTO sạch, không leak Mongoose document/internal fields.
- Extract trước các use case đọc:
  - statement summary;
  - transaction list;
  - card list/detail;
  - report summary.
- Chuyển REST route sang gọi service, giữ nguyên response compatibility.

### Acceptance criteria

- Route chỉ parse/auth/validate/call service/format HTTP response.
- Service không phụ thuộc Fastify request/reply.
- Mọi private query có workspace scope và parent validation.
- Existing backend/frontend tests vẫn pass.

## Phase 2 — MCP read-only MVP

### Scope

- Tạo `backend/src/mcp/` và package/dependency tối thiểu cho MCP SDK.
- Transport local `stdio`; chưa expose network endpoint.
- Expose tối đa 3–4 tools:
  - `get_statement_summary`;
  - `list_transactions`;
  - `compare_cards`;
  - có thể thêm `list_upcoming_statements`.
- Tool chỉ validate arguments rồi gọi service.
- Output là DTO JSON có giới hạn số lượng và khoảng thời gian.

### Security acceptance

- MCP context được tạo từ server config cho một user/workspace cố định phục vụ
  OpenClaw + Codex; không hỗ trợ login hoặc multi-user trong MVP.
- AI không được truyền hoặc override `workspaceId`, `userId`, role.
- Không có tool ghi/xóa/gửi email.
- Không expose model, raw Mongo query, token, secret hoặc audit nhạy cảm.
- Có test cross-workspace và test argument boundary.

## Phase 3 — Data consistency

### Scope

- Rà soát `actualNetBenefit` và report fixtures:
  bank cashback actual - service fee - paid card fee.
- Rà soát statement generation từ `transaction-routes.ts` và domain functions.
- Xác nhận unique index cho statement theo workspace/card/date.
- Test duplicate concurrent creation và xử lý duplicate-key read-after-conflict.
- Rà soát payment state transition, đặc biệt `PAID`.
- Dùng MongoDB transaction làm cơ chế chính cho mutation cần ghi nhiều document;
  dùng atomic update cho state transition đơn document.
- Tạo transaction session đúng cách, giới hạn transaction ngắn, retry lỗi
  transient và không gửi email/side effect bên ngoài transaction.

### Acceptance criteria

- Không tạo statement trùng khi có request đồng thời.
- Không sửa transaction hoặc đổi trạng thái trái phép khi statement đã `PAID`.
- Formula report không double-count cashback/fee.
- Có regression tests cho month-end, overdue, reopen và concurrent requests.
- Có integration test chứng minh commit/abort transaction và rollback khi một
  bước trong mutation thất bại.

## Phase 4 — Controlled mutations

Chỉ bắt đầu sau khi Phase 1–3 ổn định.

### Scope

- Expose `create_transaction` và `change_statement_payment_status` sau.
- Tách hai bước:
  1. `preview_*`: validate, resolve resource, trả proposed change, không ghi DB.
  2. `confirm_*`: nhận confirmation/idempotency key, revalidate rồi ghi DB.
- Ghi audit actor/source/tool/resource/result.

### Acceptance criteria

- Không có mutation chỉ bằng một lời gọi tự do từ AI.
- Confirmation gắn với payload/resource cụ thể và hết hạn.
- Retry cùng idempotency key không tạo duplicate effect.
- User có thể xem rõ card, statement, amount và trạng thái trước khi confirm.

## Verification strategy

```text
Phase 1: focused backend tests + typecheck + lint
Phase 2: service tests + MCP stdio smoke test + workspace isolation tests
Phase 3: domain/report tests + concurrency/integration tests
Phase 4: preview/confirm tests + audit/idempotency tests + E2E confirmation flow
```

Không dùng production MongoDB. Không commit, deploy hoặc trigger CI trong phase
planning/refactor nếu chưa có yêu cầu riêng.

## Risks and decisions to confirm

- Đã quyết định: client đầu tiên là OpenClaw với Codex.
- Đã quyết định: MCP MVP dùng một user/workspace cố định từ server config.
- Đã xác nhận cluster hiện tại là Atlas replica set 3 node (`setName`, primary,
  secondary, `isWritablePrimary: true`), nên Phase 3 dùng MongoDB transactions
  cho các mutation multi-document. Unique index, atomic update, duplicate-key
  handling và retry vẫn bắt buộc để đảm bảo idempotency và chống race condition.
