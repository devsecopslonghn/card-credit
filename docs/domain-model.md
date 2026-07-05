# Domain Model

Last reviewed: 2026-07-05

This document defines the business terms for the Card Catalog transition and records how they map to the current code.

## Terms

### Provider

A card issuer, such as Sacombank, Vietcombank, Techcombank, VPBank, HSBC, ACB or MB Bank.

Target catalog field names:

- `providerCode`
- `providerName`

Current canonical source fields:

- `data/card-presets.json` field `providerCode`.
- `data/card-presets.json` field `providerName`.

Temporary compatibility aliases:

- `bank` mirrors `providerCode`.
- `bankName` mirrors `providerName`.
- `models/Bank.ts` currently stores bank masterdata and should be treated as provider masterdata in documentation, although its existing collection and route names remain unchanged for compatibility.

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

- `models/CardType.ts` is current network masterdata despite the legacy name `CardType`.
- `app/masterdata/cardtypes/page.tsx` labels this as "Loại thẻ", but the examples and schema show it is a payment network list.
- New catalog code must not call a full card product such as `Visa Platinum Cashback` a `CardType`.

### User Card or CreditCard

A specific card owned by an application user.

Current model:

- `models/CreditCard.ts`

Current user-card fields combine product metadata and operational/cardholder data:

- Product-like snapshot fields: `bank`, `name`, `type`, `imageUrl`, `annualFee`.
- Cardholder/operational fields: `owner`, `targetSpendForWaiver`, `statementDate`, `paymentDueDate`, `amountDueThisMonth`, `isPaidThisMonth`, `monthlyData`.

### Owner

The person or label associated with a User Card, currently stored as `owner`.

Current behavior:

- Catalog-first card creation requires an explicit non-empty owner.
- Legacy UI submit still trims owner before sending and defaults empty values to `Tôi`.
- Owner filtering compares trimmed stored owner values client-side.
- Backend owner normalization trims and collapses whitespace, rejects non-string/empty values and caps length at 120 characters.

### Catalog

The centralized Card Product definitions.

Current implementation:

- `data/card-presets.json`
- `lib/cardPresets.ts`
- `lib/cardCatalogCore.mjs`

Current implementation notes:

- Legacy aliases still exist for the current UI.
- Read-only `/api/card-catalog/**` endpoints expose active catalog products to new clients.
- UI imports `cardPresets`, which is now a legacy compatibility adapter over active catalog products.

### Snapshot

Product information copied to a User Card at creation time.

Current behavior:

- Catalog-first card creation stores canonical snapshot fields: `presetId`, `providerCode`, `providerName`, `displayName`, `network`, `catalogVersion`, `legacy`.
- It also stores legacy snapshot fields: `bank`, `name`, `type`, `imageUrl`, `annualFee`.
- For compatibility, `bank` currently stores the provider code, matching existing preset behavior.
- Normal card update APIs do not allow editing catalog identity or snapshot fields.

### Legacy Card

A current or future `CreditCard` document without `presetId`.

Current behavior:

- Existing cards without `presetId` are legacy cards by the roadmap definition.
- Legacy cards remain supported by existing listing, detail, owner filter, upcoming payments and report flows.

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

`lib/cardPresets.ts` uses these types and exposes catalog helpers while preserving a legacy adapter for the current UI.

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

1. Cached image from `data/card-image-manifest.json` when status is `cached`.
2. Valid product `imageUrl`.
3. Stable local placeholder: `/card-images/placeholder-card.svg`.

`scripts/prepare-card-images.mjs` records cache, placeholder and failure state in the manifest. A failed remote image should not fail the whole build.

## Boundaries For This Batch

This batch does not:

- Rename database fields.
- Remove legacy API compatibility.
- Add catalog database collections.
- Migrate existing cards.
- Redesign the add-card UI.
