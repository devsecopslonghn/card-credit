# Domain Model

Last reviewed: 2026-07-05

This document defines the business terms for the Card Catalog transition and records how they map to the current code.

## Terms

### Provider

A card issuer, such as Sacombank, Vietcombank, Techcombank, VPBank, HSBC, ACB or MB Bank.

Target catalog field names:

- `providerCode`
- `providerName`

Current source mapping:

- `data/card-presets.json` field `bank` maps to `providerCode`.
- `data/card-presets.json` field `bankName` maps to `providerName`.
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

Current source mapping:

- `data/card-presets.json` field `id` maps to `presetId`.
- `name` maps to `displayName`.
- `type` maps to `network`.
- There is no JSON `active` field yet; current code treats all presets as selectable.

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

- Add-card submit trims owner and defaults empty values to `Tôi`.
- Owner filtering compares trimmed stored owner values client-side.
- There is no centralized owner normalization helper yet.

### Catalog

The centralized Card Product definitions.

Current implementation:

- `data/card-presets.json`
- `lib/cardPresets.ts`

Current limitations:

- The JSON still uses legacy field names.
- There are no catalog service helpers yet.
- There are no `/api/card-catalog/**` endpoints yet.
- UI imports `cardPresets` directly.

### Snapshot

Product information copied to a User Card at creation time.

Current behavior:

- The existing app stores product-like fields directly on `CreditCard` documents: `bank`, `name`, `type`, `imageUrl`, `annualFee`.
- This is effectively a manual snapshot, but it is not yet linked to a `presetId`.
- The current API does not distinguish catalog identity from operational card updates.

### Legacy Card

A current or future `CreditCard` document without `presetId`.

Current behavior:

- All existing cards are legacy cards by the roadmap definition because `CreditCard` has no `presetId` field yet.
- Legacy cards remain supported by existing listing, detail, owner filter, upcoming payments and report flows.

## Current Compatibility Mapping

When catalog fields are introduced later, legacy fallbacks should be:

```ts
const providerName = card.providerName ?? card.bank;
const displayName = card.displayName ?? card.name;
const network = card.network ?? card.type;
```

For current presets, `lib/cardPresets.ts` exposes both legacy and catalog names:

```ts
presetId = id;
providerCode = bank;
providerName = bankName;
displayName = name;
network = type;
```

## TypeScript Types

Shared catalog types are defined in `types/cardCatalog.ts`:

- `CardCatalogProduct`
- `CardCatalogProvider`
- `LegacyCardPresetFields`

`lib/cardPresets.ts` uses these types while preserving the legacy fields consumed by the current UI.

## Boundaries For This Batch

This batch does not:

- Rename database fields.
- Change API request or response contracts.
- Add catalog database collections.
- Add card-catalog API routes.
- Migrate existing cards.
- Redesign the add-card UI.
