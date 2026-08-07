# Shared Navigation Bar

## Goal

Provide one responsive navigation bar for all authenticated functional pages.

## Decisions

- Render the bar in the root layout so every page uses the same navigation.
- Resolve the current user through the existing `/api/profile` endpoint; unauthenticated pages remain unchanged.
- Show admin links only when the existing RBAC helper allows them.
- Use `aria-current="page"`, keyboard-focusable links, and wrapping layout for narrow screens.

## Status

Implemented.

## Changed files

- `frontend/components/layout/NavigationBar.tsx`: shared authenticated navigation, active route state, RBAC-aware admin links, profile link, and logout action.
- `frontend/app/layout.tsx`: renders the navigation globally.
- `backend/src/app.ts`: after a verified catalog image sync, updates existing catalog-linked cards with the same `presetId`.

## Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed with one pre-existing `@next/next/no-img-element` warning in `app/admin/card-catalog/page.tsx`.
- `npm run build`: passed; Next.js reported the existing middleware convention deprecation warning.
- `git diff --check`: passed.
