# Card Catalog Preset Audit

Last reviewed: 2026-07-05

Scope: `frontend/data/card-presets.json`, `frontend/lib/cardPresets.ts`, `frontend/lib/cardCatalogCore.mjs`, image pipeline and catalog validation.

## Audit Method

- Parsed `frontend/data/card-presets.json`.
- Checked canonical schema fields, legacy alias consistency, duplicate preset ids, provider codes, network values, annual-fee types and `sourceCheckedAt` format.
- Checked Sacombank product pages from the official Sacombank website.
- Checked official image URLs for the required Sacombank products.
- Ran catalog validation through `cd frontend && npm run validate:catalog`.
- Did not infer unverified fees or metadata from unofficial sources.

## Canonical Schema

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

Temporary legacy compatibility aliases:

- `id` mirrors `presetId`
- `bank` mirrors `providerCode`
- `bankName` mirrors `providerName`
- `name` mirrors `displayName`
- `type` mirrors `network`

`cd frontend && npm run validate:catalog` fails if legacy aliases diverge from canonical fields.

## Summary

- Preset count: 16.
- Duplicate `presetId` values: none found.
- Current unique providers:
  - `ACB` / `ACB`
  - `HSBC` / `HSBC`
  - `MBB` / `MB Bank`
  - `STB` / `Sacombank`
  - `TCB` / `Techcombank`
  - `VCB` / `Vietcombank`
  - `VPB` / `VPBank`
- Current networks:
  - `American Express`
  - `JCB`
  - `Mastercard`
  - `Visa`
- `sourceCheckedAt` format: all current values match `YYYY-MM-DD`.
- Annual fee type:
  - 15 presets use number.
  - 1 preset uses `null`: `mb-visa-modern-youth`.
- Inactive product:
  - `vpbank-shopee-platinum`
- Image behavior:
  - Remote official images are used where verified.
  - Missing or failed images fall back to `/card-images/placeholder-card.svg`.
  - `frontend/data/card-image-manifest.json` records cache/placeholder/failure status after image preparation.

## Verified Sacombank Products

Official Sacombank sources checked on 2026-07-05:

| Preset | Verified fields | Source |
| --- | --- | --- |
| `sacombank-visa-platinum-cashback` | Display name `Visa Platinum Cashback`, network `Visa`, annual fee `599000`, source URL, official image URL, active status | `https://www.sacombank.com.vn/ca-nhan/the/the-tin-dung/the-tin-dung-sacombank-visa-platinum-cashback.html` |
| `sacombank-platinum-american-express` | Display name `Platinum American Express®`, network `American Express`, annual fee `599000`, source URL, official image URL, active status | `https://www.sacombank.com.vn/ca-nhan/the/the-tin-dung/the-tin-dung-sacombank-platinum-american-express.html` |
| `sacombank-jcb-ultimate` | Display name `JCB Ultimate`, network `JCB`, annual fee `1699000`, source URL, official image URL, active status | `https://www.sacombank.com.vn/ca-nhan/the/the-tin-dung/the-tin-dung-sacombank-jcb-ultimate.html` |

Notes:

- Visa Platinum Cashback official page lists annual fee for the primary card as `599.000 VND`.
- Platinum American Express® official page lists annual fee for the primary card as `599.000 VND`.
- JCB Ultimate official page lists annual fee for the primary card as `1.699.000 VND`.
- JCB Ultimate image was corrected from the suspicious AMEX thumbnail to the official JCB image URL.

## Preset Classification

| Preset | Classification | Notes |
| --- | --- | --- |
| `vcb-visa-platinum` | Valid | Source returned HTTP 200 in the prior audit and fee hint matched `800000`. Uses placeholder/cache fallback when no remote image is configured. |
| `vcb-vibe-platinum` | Valid | Source returned HTTP 200 in the prior audit and fee hint matched `800000`. Uses placeholder/cache fallback when no remote image is configured. |
| `techcombank-visa-signature` | Valid | Source returned HTTP 200 in the prior audit and included fee hints for `1.499.000 VNĐ`. Waiver details remain unstructured. |
| `techcombank-priority-visa-signature` | Valid | Source returned HTTP 200 in the prior audit and included fee hints for `1.499.000 VNĐ`. Waiver details remain unstructured. |
| `vpbank-stepup-mastercard` | Missing information | Source returned HTTP 200 in the prior audit, but crawler found no annual-fee hint. Current numeric fee needs manual official verification. |
| `vpbank-shopee-platinum` | Deprecated | Official page text observed in prior audit indicated registration stopped. Product is kept for history with `active: false`. |
| `hsbc-cashback` | Valid | Source returned HTTP 200 in the prior audit and fee hint matched `800000`. |
| `hsbc-livefree` | Valid | Source returned HTTP 200 in the prior audit and fee hint matched `350000`. |
| `hsbc-liveplus` | Valid | Source returned HTTP 200 in the prior audit and fee hint matched `800000`. |
| `sacombank-visa-platinum-cashback` | Valid | Added from official Sacombank product page. Fee and image verified. |
| `sacombank-platinum-american-express` | Valid | Added from official Sacombank product page. Fee and image verified. |
| `sacombank-jcb-ultimate` | Valid | Fee and image verified from official Sacombank product page; suspicious AMEX image corrected. |
| `sacombank-visa-signature` | Missing information | Broad listing URL is reachable, but product-specific fee and image still need verification. |
| `acb-visa-platinum` | Missing information | Source returned HTTP 200 in the prior audit, but crawler found no annual-fee hint. Current numeric fee needs manual official verification. |
| `acb-visa-signature` | Missing information | Source returned HTTP 200 in the prior audit, but crawler found no annual-fee hint. Current numeric fee needs manual official verification. |
| `mb-visa-modern-youth` | Missing information | Source returned HTTP 403 in the prior audit. `annualFee` remains `null`, which is the supported unknown value. |

## Detailed Checks

### Duplicate or Near-Duplicate Products

- No duplicate `presetId` values found.
- Similar names exist across providers, such as `Visa Platinum` and `Visa Signature`; these are expected because provider differs.
- Techcombank `Visa Signature` and `Priority Visa Signature` remain distinct because they appear to represent different segments.

### Provider Checks

Provider codes use uppercase stable identifiers.

Values still worth business review:

- `MBB` with display name `MB Bank`.
- `ACB` with display name `ACB`.

### Network Checks

Current `network` values are payment networks only:

- `Visa`
- `Mastercard`
- `JCB`
- `American Express`

No new code calls a full Card Product a `CardType`.

### Annual Fee Checks

- Numeric type is valid for known fee values.
- `null` is valid for unknown fee values.
- Sacombank required products have official annual fee references.
- The following numeric values still need manual official verification:
  - `vpbank-stepup-mastercard`: `499000`
  - `sacombank-visa-signature`: `599000`
  - `acb-visa-platinum`: `899000`
  - `acb-visa-signature`: `1900000`
- `mb-visa-modern-youth` keeps `annualFee: null` because the source could not be accessed.

### Image Checks

- `sacombank-visa-platinum-cashback` uses official Sacombank image:
  - `https://www.sacombank.com.vn/content/dam/sacombank/images/the-new/the-tin-dung/Visa%20Credit%20Plantinum%20Cashback_contactless-01.png`
- `sacombank-platinum-american-express` uses official Sacombank image:
  - `https://www.sacombank.com.vn/content/dam/sacombank/images/the-new/the-tin-dung/thum-tin-dung-amex.png`
- `sacombank-jcb-ultimate` uses official Sacombank image:
  - `https://www.sacombank.com.vn/content/dam/sacombank/images/the-new/the-tin-dung/06.12.2018_JCB%20Ultimate_FA-01.png`
- Products without verified images use the local placeholder through the catalog service.

## Issues To Carry Forward

- Remove temporary legacy aliases after UI/API no longer depend on `id/bank/bankName/name/type`.
- Verify remaining unconfirmed fees from official product-specific sources.
- Add catalog API only in CC-010 or later.
- Consider product-specific source and image for `sacombank-visa-signature`.
