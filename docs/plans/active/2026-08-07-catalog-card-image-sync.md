# Catalog Image Synchronization to Existing Cards

## Goal

Ensure a verified image URL update in Card Catalog is reflected in existing catalog-linked cards on `/cards`.

## Decisions

- Sync only `CreditCard` records with the matching `presetId`; legacy cards without a preset remain unchanged.
- Propagate only after the image cache sync returns `VERIFIED`, preventing a broken source URL from replacing usable card images.
- Apply the global catalog image to matching cards across workspaces because Card Catalog products are global runtime metadata.

## Status

Implemented locally.

## Changed files

- `backend/src/app.ts`: verified image sync now propagates the catalog `imageUrl` to all existing cards with the same `presetId`; legacy cards remain unchanged.
- `backend/src/card-product-image-cache.ts`: normalize MongoDB BSON binary data to `Buffer` before serving cached images.
- `frontend/next.config.ts`: proxy the cached image endpoint.
- `frontend/app/admin/card-catalog/page.tsx`: add editable image URL and save/sync action.

## Validation

- `cd backend && npm run validate`: passed (63 tests, typecheck, lint, build).
- Frontend typecheck, lint, build, and `git diff --check`: passed in the preceding UI/proxy phase.

## Deployment note

The deployed backend must be rebuilt before the image endpoint fix and propagation logic are active. Existing verified cache rows should be synced once after deployment to propagate their URLs to existing cards.
