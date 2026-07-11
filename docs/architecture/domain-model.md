# Domain Model

Last reviewed: 2026-07-11

This document defines the business terms for the Card Catalog transition and records how they map to the current code.

## Terms

### Provider

A card issuer, such as Sacombank, Vietcombank, Techcombank, VPBank, HSBC, ACB or MB Bank.

Target catalog field names:

- `providerCode`
- `providerName`

Baseline canonical fields:

- `frontend/data/card-presets.json` field `providerCode`.
- `frontend/data/card-presets.json` field `providerName`.

Temporary compatibility aliases:

- `bank` mirrors `providerCode`.
- `bankName` mirrors `providerName`.
- `backend/src/masterdata.ts` owns bank/provider masterdata; legacy collection
  and route names remain for compatibility.

### Card Product

A predefined credit card product issued by a Provider, such as `Sacombank JCB Ultimate` or `Vietcombank Visa Platinum`.

Target catalog field names:

- `presetId`
- `displayName`
- `network`
- `annualFee`
- `imageUrl`
- `sourceUrl`
- `sourceCheckedAt`
- `active`

Current canonical source fields:

- `presetId`.
- `displayName`.
- `network`.
- `annualFee`.
- `imageUrl`.
- `sourceUrl`.
- `sourceCheckedAt`.
- `active`.
- `sortOrder`.

Temporary compatibility aliases:

- `id` mirrors `presetId`.
- `name` mirrors `displayName`.
- `type` mirrors `network`.

### Network

The payment network only: Visa, Mastercard, JCB, American Express and similar networks.

Current source mapping:

- `backend/src/masterdata.ts` owns network masterdata despite the legacy API name `cardtypes`.
- `frontend/app/masterdata/cardtypes/page.tsx` labels this as "Loại thẻ", but the examples and schema show it is a payment network list.
- New catalog code must not call a full card product such as `Visa Platinum Cashback` a `CardType`.

### User Card or CreditCard

A specific card owned by an application user.

Current model:

- `backend/src/models/credit-card.ts`

Current user-card fields combine product metadata and operational/cardholder data:

- Product-like snapshot fields: `bank`, `name`, `type`, `imageUrl`, `annualFee`.
- Cardholder/operational fields: `owner`, `targetSpendForWaiver`, `statementDate`, `paymentDueDate`, `amountDueThisMonth`, `isPaidThisMonth`, `monthlyData`.

### Owner

The person or label associated with a User Card, currently stored as `owner`.

Current behavior:

- Catalog-first card creation requires an explicit non-empty owner.
- Legacy UI submit still trims owner before sending and defaults empty values to `Tôi`.
- Owner filtering compares trimmed/collapsed stored owner values client-side.
- Backend owner normalization trims and collapses whitespace, rejects non-string/empty values and caps length at 120 characters.
- The `/cards` UI applies the same conservative trim/collapse behavior for validation and filtering, without uppercasing or changing Vietnamese characters.

### Catalog

The centralized Card Product definitions.

Current implementation:

- MongoDB `cardproducts` collection is the mutable runtime source of truth.
- `frontend/data/card-presets.json` is a version-controlled, read-only baseline
  used by validation, explicit import, development bootstrap, and recovery.
- `frontend/lib/cardPresets.ts`
- `frontend/lib/cardCatalogCore.mjs`

Current implementation notes:

- Legacy aliases still exist for the current UI.
- Read-only `/api/card-catalog/**` endpoints expose active catalog products to new clients.
- The `/cards` add-card UI reads catalog data through `/api/card-catalog/**`; it does not import catalog JSON or `cardPresets`.
- `cardPresets` remains as a legacy compatibility adapter for code that has not moved to the catalog API yet.

### Snapshot

Product information copied to a User Card at creation time.

Detailed snapshot and future sync rules are defined in [`catalog-snapshot-policy.md`](catalog-snapshot-policy.md).

Current behavior:

- Catalog-first card creation stores canonical snapshot fields: `presetId`, `providerCode`, `providerName`, `displayName`, `network`, `catalogVersion`, `legacy`.
- It also stores legacy snapshot fields: `bank`, `name`, `type`, `imageUrl`, `annualFee`.
- For compatibility, `bank` currently stores the provider code, matching existing preset behavior.
- Normal card update APIs do not allow editing catalog identity or snapshot fields.
- The `/cards` listing edit modal exposes only operational fields and keeps product snapshot data read-only.
- The card detail page also keeps product snapshot fields read-only and submits only operational update payloads.

### Legacy Card

A current or future `CreditCard` document without `presetId`.

Current behavior:

- Existing cards without `presetId` are legacy cards by the roadmap definition.
- Legacy cards remain supported by existing listing, detail, owner filter, upcoming payments and report flows.
- The `/cards` listing shows legacy cards in provider groups using fallback fields and marks them with a small Legacy badge.
- The detail page shows legacy cards with the same fallback fields and does not require selecting a catalog preset.

## Report Compatibility

`GET /api/reports/summary` returns canonical catalog fields for each card while preserving legacy compatibility fields:

- Canonical: `presetId`, `providerCode`, `providerName`, `displayName`, `network`, `imageUrl`, `legacy`.
- Compatibility: `bank`, `name`, `type`.

Annual fee snapshot policy in reports:

- `annualFee: null` remains `null` in card output.
- Calculations treat unknown annual fee as `0` only for totals to avoid `NaN`.
- `annualFeeKnown` tells consumers whether the annual fee was known.

## Current Compatibility Mapping

When catalog fields are introduced later, legacy fallbacks should be:

```ts
const providerName = card.providerName ?? card.bank;
const displayName = card.displayName ?? card.name;
const network = card.network ?? card.type;
```

For current presets, canonical fields are the source of truth. Legacy aliases are compatibility-only:

```ts
id = presetId;
bank = providerCode;
bankName = providerName;
name = displayName;
type = network;
```

## TypeScript Types

Shared catalog types are defined in `types/cardCatalog.ts`:

- `CardCatalogProduct`
- `CardCatalogProvider`
- `LegacyCardPresetFields`

`frontend/lib/cardPresets.ts` uses these types and exposes catalog helpers while preserving a legacy adapter for the current UI.

## Inactive Product Behavior

Inactive products remain in `getAllCatalogProducts()` for history and migration review.

Normal picker helpers exclude inactive products:

- `getActiveCatalogProducts()`
- `getProductsByProvider(providerCode)`
- `groupProductsByProvider()`
- `cardPresets`

Current inactive product:

- `vpbank-shopee-platinum`

## Image Fallback Behavior

Catalog image lookup order:

1. Cached image from `frontend/data/card-image-manifest.json` when status is `cached`.
2. Valid product `imageUrl`.
3. Stable local placeholder: `/card-images/placeholder-card.svg`.

`frontend/scripts/prepare-card-images.mjs` records cache, placeholder and failure state in the manifest. A failed remote image should not fail the whole build.

## Boundaries For This Batch

This batch does not:

- Rename database fields.
- Remove legacy API compatibility.
- Automatically synchronize catalog snapshots into existing User Cards.
- Migrate existing cards.
- Complete full accessibility audit/focus trap work.
