# Card Credit

Next.js app for tracking user credit cards, payment reminders, monthly spend/cashback data and card catalog presets.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000/cards`.

Database-backed API routes require:

```bash
MONGODB_URI="mongodb connection string"
```

## Card Catalog

Catalog source of truth for this milestone:

- `data/card-presets.json`
- `lib/cardPresets.ts`
- `lib/cardCatalogCore.mjs`

Canonical product fields:

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

Temporary legacy aliases remain for current UI compatibility:

- `id = presetId`
- `bank = providerCode`
- `bankName = providerName`
- `name = displayName`
- `type = network`

Inactive products stay in the catalog for history but are excluded from normal picker helpers.

### Catalog API

Read-only catalog endpoints return `{ "data": ... }` and expose active products only:

```text
GET /api/card-catalog/providers
GET /api/card-catalog/products
GET /api/card-catalog/products?provider=STB
GET /api/card-catalog/products/:presetId
```

Catalog API responses use canonical product fields and omit temporary legacy aliases such as `bank`,
`name` and `type`. Unknown product ids return `404 PRESET_NOT_FOUND`; unknown providers or providers
without active products return `404 PROVIDER_NOT_FOUND`.

### Card API Compatibility

New card creation contract:

```json
{
  "presetId": "sacombank-visa-platinum-cashback",
  "owner": "Long Ho"
}
```

The server resolves product metadata from the catalog and snapshots both canonical fields
(`presetId`, `providerCode`, `providerName`, `displayName`, `network`) and legacy fields
(`bank`, `name`, `type`, `imageUrl`, `annualFee`) so the current UI keeps working. Client metadata
overrides such as `annualFee`, `imageUrl`, `providerName`, `displayName` and `network` are ignored
for catalog-first creation.

The legacy `POST /api/cards` payload remains temporarily supported for the current UI. It is
allowlisted, marked with `X-Deprecated-Contract: legacy-card-create`, and logged as deprecated.

`PUT /api/cards/:id` accepts only operational fields:

```text
owner
targetSpendForWaiver
statementDate
paymentDueDate
amountDueThisMonth
isPaidThisMonth
monthlyData
```

Identity and catalog snapshot fields such as `presetId`, `annualFee`, `imageUrl`, `bank`, `name` and
`type` are not updated through the normal card update route.

API validation errors use:

```json
{
  "error": {
    "code": "INVALID_OWNER",
    "message": "Tên chủ thẻ không hợp lệ.",
    "fields": {
      "owner": "Tên chủ thẻ không được để trống."
    }
  }
}
```

Card reads serialize legacy documents with fallback values:

```ts
providerName ?? bank
displayName ?? name
network ?? type
legacy ?? !presetId
```

## Cards UI

`/cards` now uses the catalog-first add-card flow:

```text
Select Provider
Select Card Product
Review product preview
Enter owner
Create card
```

The UI reads catalog data through `/api/card-catalog/**` and creates cards with only:

```json
{
  "presetId": "sacombank-visa-platinum-cashback",
  "owner": "Long Ho"
}
```

The listing groups cards by provider, uses legacy fallbacks for old cards, and uses responsive flex wrapping so cards collapse to one column on narrow screens.

Known UI transition limits:

- Detail page catalog-field cleanup is tracked separately in CC-023.
- Report/export UI changes are tracked separately in CC-024.
- Full focus trap/accessibility audit is tracked separately in CC-026.

## Validation And Tests

```bash
npm run validate:catalog
npm test
npm run lint
npm run build
```

`validate:catalog` and `npm test` do not require MongoDB or network access.

Known baseline: lint currently reports pre-existing app/API issues outside the catalog files.

## Images

Remote card images are cached by:

```bash
npm run prepare:card-images
```

The script writes status to `data/card-image-manifest.json`. Missing, invalid or failed remote images use:

```text
/card-images/placeholder-card.svg
```

Docker and Jenkins run the same image preparation script before build.

## Sample Data

Seed safe regression data with:

```bash
MONGODB_URI="mongodb connection string" npm run seed:sample
```

The sample seed includes:

- Sacombank user cards.
- Non-Sacombank user cards.
- Cards with monthly data.
- A card without payment due date.

Do not run sample seed against production data unless explicitly approved.

## Adding A Card Product

1. Add an entry to `data/card-presets.json` using canonical fields.
2. Keep temporary legacy aliases matching canonical fields while the current UI still depends on them.
3. Use official product `sourceUrl` when available.
4. Use `annualFee: null` for unverified fees.
5. Set `active: false` for products that should not appear in the normal picker.
6. Run `npm run validate:catalog` and `npm test`.
