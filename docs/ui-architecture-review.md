# UI Architecture Review — Stitch-aligned frontend

## Decision

Giữ nguyên modular monolith và API boundaries hiện tại. Stitch chỉ là visual
source of truth; không đưa HTML export của Stitch vào runtime vì export đó là
static mock, dùng CDN fonts/assets và không chứa business state.

## Current assessment

- `app/*/page.tsx` là route composition và state orchestration; các API client
  nằm riêng trong `lib/api`, phù hợp với App Router.
- `components/cards/*` đã chứa phần lớn reusable card/transaction flows nhưng
  styling còn lặp lại và phụ thuộc trực tiếp vào Tailwind color primitives.
- Backend/domain calculation không bị UI import trực tiếp và phải tiếp tục là
  authority cho debt, statement, payment và cashback.
- Navigation là shared shell; đây là điểm có blast radius cao nhất nên theme
  được áp dụng bằng tokens và compatibility selectors trước khi tách component.

## Stitch mapping

| Stitch concept | Runtime implementation |
| --- | --- |
| Cyan primary CTA | `--primary-bright`, `.cc-page button.bg-blue-*` compatibility |
| Navy text/sidebar | `--foreground`, navigation tokens |
| Layered white surfaces | `.cc-section`, `.cc-panel` |
| 8px rhythm / 16px cards | shared spacing and radius tokens |
| Mono financial values | `.cc-tabular`, existing Geist Mono fallback |
| Mobile bottom nav | `.cc-mobile-bottom` |

## Refactor boundary

This phase standardizes the shared shell and visual primitives without changing
API contracts, financial formulas, auth behavior, or destructive workflows.
New screens should compose `cc-page`, `cc-section`, `cc-panel`, `cc-control` and
semantic status classes. A later phase can extract explicit `components/ui/*`
primitives once route behavior is covered by visual regression tests.

## Risks and follow-up

- A global compatibility layer can affect legacy admin screens; verify admin
  contrast and mutation states before release.
- Stitch includes screens (notifications, payment flow, analytics) that do not
  currently have dedicated product routes. They should be introduced as real
  product flows only after API contracts exist, not as mock-only pages.
- Add Playwright screenshot baselines for `/cards`, `/cards/[id]`, `/reports`,
  `/profile` and mobile viewport before doing pixel-level extraction.

## Full-stack Stitch routes

The Stitch-oriented navigation now maps to real routes:

- `/cards`: dashboard and card management
- `/transactions`: searchable transaction history
- `/payments`: statement payment queue using the existing state machine
- `/analytics`: report-derived spending insights
- `/notifications`: workspace-scoped payment notification projection
- `/profile`: account/settings and calendar reminder controls

No mock-only payment or analytics data is persisted by the UI.
