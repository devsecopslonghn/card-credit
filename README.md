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
