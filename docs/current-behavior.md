# Current Behavior Baseline

Last reviewed: 2026-07-05

This document records the current implementation before the Card Catalog migration. It is based on the repository source, not on the future roadmap target.

## Repository State Reviewed

- Branch: `ai-task/catalog-backend`
- Recent commits:
  - `41d10ec 1111`
  - `2bb026b Update`
  - `44a8e50 feat: CC-010 to CC-016`
  - `c8364ca feat: establish canonical card catalog foundation`
  - `026adf3 feat: establish canonical card catalog foundation`
- Working tree changes in this continuation are scoped to backend catalog/card API behavior, docs and tests.
- `README.md` now contains catalog foundation commands and sample-data notes.

## Source Structure

- `app/cards/page.tsx`: main card list page, add/edit/delete modal, owner filter, calendar notes, upcoming payment list.
- `app/cards/[id]/page.tsx`: card detail page, general card payment settings, monthly data table and monthly edit modal.
- `app/api/cards/route.ts`: list and create cards with catalog-first and transitional legacy contracts.
- `app/api/cards/[id]/route.ts`: update operational fields and delete cards.
- `app/api/card-catalog/**`: read-only catalog provider and product endpoints.
- `app/api/reports/summary/route.ts`: JSON summary export.
- `app/api/notes/route.ts`: calendar notes.
- `app/api/banks/**`: bank masterdata.
- `app/api/cardtypes/**`: card type/network masterdata.
- `models/CreditCard.ts`: current user card schema.
- `models/Bank.ts`: bank masterdata schema.
- `models/CardType.ts`: network/card type masterdata schema.
- `models/CalendarNote.ts`: calendar note schema.
- `data/card-presets.json`: current preset source data.
- `lib/cardPresets.ts`: preset loader and generated image fallback.
- `scripts/prepare-card-images.mjs`: caches remote preset images into `public/card-images/generated` and records placeholder/failure status in `data/card-image-manifest.json`.
- `scripts/validate-card-catalog.mjs`: validates catalog schema without MongoDB or network access.
- `scripts/crawl-card-presets.mjs`: fetches source pages and prints annual-fee hints.
- `scripts/seed-sample.mjs`: seeds sample banks, card types, cards and notes.

## Current User Features

- Card listing:
  - `GET /api/cards` fetches all cards sorted by `createdAt` descending.
  - UI renders cards in a responsive CSS grid.
  - Each card shows image, bank, name, type/network, owner, payment due date, amount due and paid checkbox.
- Add card:
  - The add modal supports either selecting a preset or manually entering card metadata.
  - User-entered fields include `bank`, `type`, `owner`, `name`, `annualFee` and image upload.
  - Selecting a preset fills the same legacy fields from `cardPresets`.
  - `POST /api/cards` now prefers the catalog-first `{ presetId, owner }` contract.
  - Legacy full-card payloads are temporarily supported through an allowlisted service path.
- Edit card from listing:
  - Current UI may still send full card payloads.
  - `PUT /api/cards/:id` now updates only operational fields and ignores identity fields when at least one allowed operational field is present.
- Delete card:
  - Listing has a delete confirmation modal.
  - `DELETE /api/cards/:id` deletes the document by id.
- Mark paid:
  - Listing checkbox updates `isPaidThisMonth` through `PUT /api/cards/:id`.
- Filter by owner:
  - UI derives owners from loaded cards with `card.owner?.trim()`.
  - Filtering is client-side.
- Calendar note:
  - Calendar on `/cards` supports selecting a date and saving a text note.
  - Empty content deletes the note.
  - Notes use `date` in `YYYY-MM-DD` format.
- Upcoming payments:
  - UI lists cards with `paymentDueDate` and `isPaidThisMonth !== true`.
  - The list is sorted by payment due date ascending.
- Card detail:
  - Detail page fetches all cards, then finds the selected card by id client-side.
  - Detail page supports editing annual fee, target spend for waiver, statement date, payment due date and amount due this month.
  - Detail page supports editing 12 monthly records with `spend`, `cashback`, `fee` and `otherInterest`.
- Summary report:
  - `GET /api/reports/summary` returns totals, card summaries and notes.
  - Optional query params: `owner`, `includeNotes=false`.

## Current API Contract

### `GET /api/cards`

Returns an array of `CreditCard` documents from MongoDB.

Response is serialized for legacy read compatibility. It includes stored fields and derives:

```ts
providerName = providerName ?? bank
displayName = displayName ?? name
network = network ?? type
legacy = legacy ?? !presetId
```

Typical fields include:

```json
{
  "_id": "string",
  "bank": "VCB",
  "name": "Visa Platinum",
  "type": "Visa",
  "owner": "Tôi",
  "imageUrl": "string",
  "annualFee": 800000,
  "targetSpendForWaiver": 0,
  "statementDate": "",
  "paymentDueDate": "",
  "amountDueThisMonth": 0,
  "isPaidThisMonth": false,
  "monthlyData": []
}
```

### `POST /api/cards`

Preferred request body is catalog-first:

```json
{
  "presetId": "sacombank-visa-platinum-cashback",
  "owner": "Long Ho"
}
```

The route resolves product metadata from the catalog. Client overrides for product metadata are not trusted.

The legacy full-card payload remains transitional and allowlisted:

```json
{
  "bank": "STB",
  "name": "JCB Ultimate",
  "type": "JCB",
  "owner": "Long Ho",
  "imageUrl": "data:image/svg+xml,...",
  "annualFee": 1699000
}
```

Response: created card, HTTP `201`. Legacy create responses include `X-Deprecated-Contract: legacy-card-create`.

### `PUT /api/cards/:id`

Current request body may be partial or a full card document from the old UI. The route applies an explicit allowlist:

- `owner`
- `targetSpendForWaiver`
- `statementDate`
- `paymentDueDate`
- `amountDueThisMonth`
- `isPaidThisMonth`
- `monthlyData`

Identity/snapshot fields such as `presetId`, `annualFee`, `imageUrl`, `bank`, `name` and `type` are not updated.

Response: serialized updated card, HTTP `200`; structured `CARD_NOT_FOUND`, HTTP `404` if not found.

### `DELETE /api/cards/:id`

Deletes the document by id.

Response:

```json
{ "message": "Đã xóa thẻ thành công" }
```

### `GET /api/reports/summary`

Query params:

- `owner`: exact owner value after trimming query input.
- `includeNotes=false`: excludes notes.

Response includes:

```json
{
  "generatedAt": "ISO datetime",
  "filters": { "owner": null, "includeNotes": true },
  "totals": {},
  "cards": [],
  "notes": []
}
```

### `GET /api/notes`

Returns all calendar notes.

### `POST /api/notes`

Upserts or deletes a note.

```json
{
  "date": "2026-07-30",
  "content": "Thanh toán thẻ"
}
```

### `GET|POST /api/banks`, `PUT|DELETE /api/banks/:id`

CRUD for bank masterdata. Bank logos are stored as image strings, commonly base64 data URLs.

### `GET|POST /api/cardtypes`, `PUT|DELETE /api/cardtypes/:id`

CRUD for current `CardType` masterdata. In source comments and UI this represents payment networks such as Visa, Mastercard and JCB.

## Current CreditCard Model

Required product-like fields:

- `bank`
- `name`
- `type`
- `imageUrl`
- `annualFee`

Cardholder/operational fields:

- `owner`
- `targetSpendForWaiver`
- `statementDate`
- `paymentDueDate`
- `amountDueThisMonth`
- `isPaidThisMonth`
- `monthlyData`

Catalog-compatible fields now exist in the Mongoose schema and are optional for old documents:

- `presetId`
- `providerCode`
- `providerName`
- `displayName`
- `network`
- `catalogVersion`
- `legacy`

Non-unique indexes exist for `presetId` and `providerCode` because many user cards may point at the same product while future reads/filtering need stable lookup fields.

## Current Preset Behavior

- Source of truth is `data/card-presets.json`.
- Loader is `lib/cardPresets.ts`.
- Current JSON uses legacy field names: `id`, `bank`, `bankName`, `name`, `type`.
- Canonical catalog fields in JSON are now:
  - `presetId`
  - `providerCode`
  - `providerName`
  - `displayName`
  - `network`
  - `annualFee`
  - `imageUrl`
  - `sourceUrl`
  - `sourceCheckedAt`
  - `active`
  - `sortOrder`
- Temporary legacy compatibility aliases remain in JSON:
  - `id` mirrors `presetId`
  - `bank` mirrors `providerCode`
  - `bankName` mirrors `providerName`
  - `name` mirrors `displayName`
  - `type` mirrors `network`
- `lib/cardPresets.ts` exports a typed catalog service with helper functions:
  - `getAllCatalogProducts()`
  - `getActiveCatalogProducts()`
  - `getCatalogProviders()`
  - `getProductsByProvider(providerCode)`
  - `getPresetById(presetId)`
  - `groupProductsByProvider()`
- `cardPresets` is now a legacy compatibility adapter for the current UI and includes active products only.
- Inactive products remain in the full catalog but do not appear in the current add-card preset picker.
- `/api/card-catalog/providers` returns provider groups with active products.
- `/api/card-catalog/products` returns active products.
- `/api/card-catalog/products?provider=STB` returns active products for a provider code.
- `/api/card-catalog/products/:presetId` returns one active product or `404 PRESET_NOT_FOUND`.

## Current Error Response

Card catalog and card APIs now use a structured error body:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Request body không hợp lệ.",
    "fields": {}
  }
}
```

Known codes include `INVALID_REQUEST`, `INVALID_JSON`, `INVALID_CARD_ID`, `INVALID_OWNER`,
`PRESET_NOT_FOUND`, `PRESET_INACTIVE`, `PROVIDER_NOT_FOUND`, `CARD_NOT_FOUND`,
`FORBIDDEN_UPDATE_FIELD`, `DATABASE_ERROR` and `INTERNAL_ERROR`.

## Sample Data Baseline

Existing `scripts/seed-sample.mjs` seeds:

- One VCB card: `VCB Cashback Plus`, owner `Tôi`, with monthly data and payment due date.
- One TCB card: `TCB Family Platinum`, owner `Mẹ`, with monthly data and payment due date.
- One Sacombank card: `STB Visa Platinum Cashback`, owner `Long Ho`, with monthly data and payment due date.
- One Sacombank card: `STB JCB Ultimate`, owner `Regression No Due Date`, with no `paymentDueDate`.
- Two calendar notes.
- Bank masterdata for VCB, TCB and STB.
- CardType masterdata for Visa, Mastercard, JCB and American Express.

Sample-data coverage:

- Sacombank sample user card exists.
- Non-Sacombank sample user cards exist.
- Cards with monthly data exist.
- A card without payment due date exists.

Run with:

```bash
MONGODB_URI="..." npm run seed:sample
```

Do not point this command at production data unless explicitly approved.

## Differences From Roadmap Target

- Current creation contract is not `{ "presetId": "...", "owner": "..." }`.
- Client can currently submit or override product metadata.
- Server currently trusts the card request body.
- `CardType` currently acts as network masterdata, not Card Product.
- Catalog is not exposed through API endpoints.
- Catalog JSON is normalized to target field names, while temporary legacy aliases remain for compatibility.
- CreditCard schema has not yet been extended with catalog fields.
- Images may be remote, generated SVG data URLs, or uploaded data URLs.

## Local Run Notes

The app requires `MONGODB_URI` for API routes and runtime data access. Without it, database-backed pages and API routes fail when they attempt to connect.

Catalog validation and unit tests do not require MongoDB:

```bash
npm run validate:catalog
npm test
```
