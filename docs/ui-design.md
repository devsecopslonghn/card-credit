# UI/UX design — Card Credit

## 1. UX principles

- Người dùng luôn thấy khoản phải trả và hạn thanh toán trước chi tiết cashback.
- Tách trực quan ba khái niệm: **dư nợ**, **cashback**, **phí**.
- Không dùng màu duy nhất để biểu thị trạng thái; luôn có label/text.
- Form tài chính hiển thị đơn vị VND, preview phép tính và lỗi tại field.
- Các thao tác destructive (xóa card, merge duplicate, reopen paid statement)
  cần confirmation và nêu rõ hậu quả.
- Desktop dùng sidebar; mobile dùng top bar + bottom navigation; giữ safe-area.
- UI không render secret calendar token sau khi user rời màn hình create.

## 2. Navigation structure

```text
Card Credit
├── User dashboard (/cards)
│   ├── Card detail (/cards/:id)
│   └── Statement detail (nested in card detail)
├── Báo cáo (/reports)
├── Hồ sơ (/profile)
│   ├── Reminder preferences (card detail/profile context)
│   └── Calendar subscriptions
└── Admin Console (admin only)
    ├── Quản lý người dùng (/admin/users)
    ├── Card Catalog (/admin/card-catalog)
    ├── Ngân hàng (/masterdata/banks)
    └── Loại thẻ (/masterdata/cardtypes)
```

Public unauthenticated pages: `/login`, `/register`, `/forgot-password`.
`/` redirect về `/cards` sau khi authenticated.

## 3. Main pages

### Login/register/reset

- Email/password form, visible validation, loading/disabled submit.
- Generic reset confirmation để không lộ account existence.
- Error banner có `role=alert`; focus chuyển về field lỗi.

### Dashboard — `/cards`

Mục tiêu: trong vài giây trả lời “Tôi có những thẻ nào và sắp phải trả bao
nhiêu?”.

Components:

- Summary KPI cards: current debt, due this month, due next month.
- Owner/provider filter.
- Provider sections và `CardList`/`CardItem`.
- Card image với cached/remote/placeholder fallback.
- Upcoming payments list với status `OPEN`, `OVERDUE`, `PAID`.
- `AddCardModal`, `TransactionFormModal`, duplicate resolver.
- Empty state hướng dẫn tạo card hoặc import catalog.

States cần thiết: loading skeleton, empty, error/retry, inactive card badge,
legacy badge, duplicate warning.

### Card detail — `/cards/[id]`

Sections theo thứ tự:

1. Card header: product snapshot, provider/network, owner, active status.
2. Operational settings: statement day, due days, annual fee waiver target,
   cashback cap, reminder.
3. Debt summary và upcoming payment actions.
4. Statement list/calendar: period, due date, amount, payment status.
5. Statement detail drawer/page: transaction table, summary formula, payment
   action, calendar email.
6. Transaction form: outcome, income amount/rate, cashback, note, waiver flag.
7. Monthly bank cashback section.
8. Card fee payment history.

Catalog identity fields phải read-only sau khi card được tạo; operational update
không được vô tình thay snapshot.

### Reports — `/reports`

- Filter bar: all-time/year/month, owner, card.
- KPI cards: spending, service fee, bank cashback expected/actual/rejected, paid
  card fees, actual net benefit.
- Per-card table giữ card zero rows để filter không gây mất context.
- Transaction cashback reconciliation hiển thị riêng, kèm note “không cộng
  trùng”.
- `Xuất JSON` dùng đúng filter state hiện tại và báo download/error rõ ràng.

### Profile — `/profile`

- Display name/email read-only rules.
- Password/reset guidance.
- Calendar subscriptions: create device label, one-time feed URL reveal, copy,
  revoke.
- Reminder timezone/default preferences nếu product quyết định đặt ở profile.

### Admin pages

- `/admin/users`: searchable table, role/workspace/display name edit, lock/state
  visibility theo policy, audit navigation.
- `/admin/card-catalog`: provider/product list, active toggle, product editor,
  source URL/date, image/cache state, validation feedback, audit result.
- `/masterdata/banks` và `/masterdata/cardtypes`: CRUD table, duplicate warning,
  admin-only mutation.
- Admin shell dùng màu slate riêng, có link quay lại user dashboard để giảm nhầm
  context.

## 4. Primary user flows

### Create card

```text
Dashboard -> Add card -> choose provider -> choose active product
           -> enter owner/config -> preview snapshot -> Save
           -> card appears in provider group -> optional add transaction
```

### Record and pay statement

```text
Card detail -> Add transaction -> validation/summary preview
           -> transaction assigned to statement -> review statement
           -> Close -> Pay (paid amount/date) -> locked state
           -> optional Reopen confirmation
```

### Review monthly benefit

```text
Card detail -> Monthly cashback -> select YYYY-MM -> expected/status/actual
             -> Card fee payment -> record actual fee
Reports -> choose same month/filter -> inspect actual net benefit -> Export JSON
```

### Enable calendar/reminder

```text
Statement -> Send calendar email (server recipient)
Profile -> Create subscription -> label -> reveal/copy URL once
Calendar app -> subscribe feed
Profile -> revoke when device is no longer trusted
```

## 5. Component and state conventions

- API client functions return typed success or normalized API error; page decides
  empty/error/loading rendering.
- Mutation modal prevents duplicate submit, shows optimistic state only where
  rollback is safe; financial writes prefer server-confirmed refresh.
- Dates and currency format centrally; raw integer never displayed without VND
  formatting.
- Confirmation copy includes object, current state and irreversible consequence.
- Focus trap for modal, Escape close where safe, focus restore to trigger.
- Tables collapse to cards or horizontal scroll on mobile; critical due date and
  amount remain visible first.

## 6. Accessibility acceptance

- `lang="vi"`, page title and heading hierarchy present.
- Every input has visible label or accessible name; errors linked by `aria-describedby`.
- All actions keyboard reachable; focus indicator visible.
- `role=alert/status` for API success/error and async state.
- Status uses text (`Đã thanh toán`, `Quá hạn`, etc.) in addition to color/icon.
- Mobile bottom nav does not cover content; safe-area padding included.
- Automated accessibility tests cover core dashboard, card detail and modal flows;
  manual keyboard/screen-reader smoke test is release criterion.

