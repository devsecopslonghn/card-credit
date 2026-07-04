# Current Behavior Baseline

Last reviewed: 2026-07-05

This document records the current implementation before the Card Catalog migration. It is based on the repository source, not on the future roadmap target.

## Repository State Reviewed

- Branch: `master`
- Recent commits:
  - `85a8935 Do something`
  - `f7b087d Update`
  - `764b07e 1111`
  - `8f15da0 push export`
  - `f1cde91 fix`
- Working tree before this batch already contained modified `AGENTS.md` and untracked `docs/`.
- `README.md` is still the default Create Next App README and does not describe this application.

## Source Structure

- `app/cards/page.tsx`: main card list page, add/edit/delete modal, owner filter, calendar notes, upcoming payment list.
- `app/cards/[id]/page.tsx`: card detail page, general card payment settings, monthly data table and monthly edit modal.
- `app/api/cards/route.ts`: list and create cards.
- `app/api/cards/[id]/route.ts`: update and delete cards.
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
- `scripts/prepare-card-images.mjs`: caches remote preset images into `public/card-images/generated`.
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
  - `POST /api/cards` currently stores the request body directly with `CreditCard.create(data)`.
- Edit card from listing:
  - The listing edit modal updates legacy identity fields and image data.
  - `PUT /api/cards/:id` removes `_id`, `createdAt`, `updatedAt`, then passes the remaining body to `findByIdAndUpdate`.
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

Current fields are not explicitly shaped by the API route. They reflect the Mongoose document, including:

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

Current request body is the legacy full-card payload. The route does not validate or allowlist fields.

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

Response: created MongoDB document, HTTP `201`.

### `PUT /api/cards/:id`

Current request body is a partial or full card document. The route removes `_id`, `createdAt` and `updatedAt`, but otherwise accepts all remaining fields.

Response: updated MongoDB document, HTTP `200`; `{ "message": "Không tìm thấy thẻ" }`, HTTP `404` if not found.

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

There are no catalog fields yet in the Mongoose schema:

- `presetId`
- `providerCode`
- `providerName`
- `displayName`
- `network`
- `catalogVersion`
- `legacy`

## Current Preset Behavior

- Source of truth is `data/card-presets.json`.
- Loader is `lib/cardPresets.ts`.
- Current JSON uses legacy field names: `id`, `bank`, `bankName`, `name`, `type`.
- `lib/cardPresets.ts` now exposes catalog aliases in TypeScript at runtime:
  - `presetId` from `id`
  - `providerCode` from `bank`
  - `providerName` from `bankName`
  - `displayName` from `name`
  - `network` from `type`
- No `active` field exists in JSON. Current runtime treats all existing presets as active because the UI currently displays all presets.
- No `/api/card-catalog/**` endpoints exist.

## Sample Data Baseline

Existing `scripts/seed-sample.mjs` seeds:

- One VCB card: `VCB Cashback Plus`, owner `Tôi`, with monthly data and payment due date.
- One TCB card: `TCB Family Platinum`, owner `Mẹ`, with monthly data and payment due date.
- Two calendar notes.
- Bank masterdata for VCB and TCB.
- CardType masterdata for Visa and Mastercard.

Gaps against CC-001 sample-data target:

- No Sacombank sample user card is seeded.
- No sample card from the seed script lacks `paymentDueDate`.
- A card with monthly data exists.
- A non-Sacombank bank card exists.

No sample data was changed in this batch.

## Differences From Roadmap Target

- Current creation contract is not `{ "presetId": "...", "owner": "..." }`.
- Client can currently submit or override product metadata.
- Server currently trusts the card request body.
- `CardType` currently acts as network masterdata, not Card Product.
- Catalog is not exposed through API endpoints.
- Catalog JSON has not yet been normalized to target field names.
- CreditCard schema has not yet been extended with catalog fields.
- Images may be remote, generated SVG data URLs, or uploaded data URLs.

## Local Run Notes

The app requires `MONGODB_URI` for API routes and runtime data access. Without it, database-backed pages and API routes fail when they attempt to connect.
