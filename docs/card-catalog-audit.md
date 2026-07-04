# Card Catalog Preset Audit

Last reviewed: 2026-07-05

Scope: `data/card-presets.json` and current loader behavior in `lib/cardPresets.ts`.

## Audit Method

- Parsed `data/card-presets.json`.
- Checked preset count, duplicate ids, provider codes, network values, annual-fee types and `sourceCheckedAt` format.
- Ran `node scripts/crawl-card-presets.mjs` to check source URL HTTP status and collect fee hints.
- Did not modify `data/card-presets.json`.
- Did not replace image URLs or infer unverified business metadata.

## Summary

- Preset count: 14.
- Duplicate `id` values: none found.
- Current unique providers:
  - `ACB` / `ACB`
  - `HSBC` / `HSBC`
  - `MBB` / `MB Bank`
  - `STB` / `Sacombank`
  - `TCB` / `Techcombank`
  - `VCB` / `Vietcombank`
  - `VPB` / `VPBank`
- Current networks: `JCB`, `Mastercard`, `Visa`.
- `sourceCheckedAt` format: all current values match `YYYY-MM-DD`.
- Annual fee type:
  - 13 presets use number.
  - 1 preset uses `null`: `mb-visa-modern-youth`.
- Image data:
  - 13 presets have `imageUrl: null` and rely on generated fallback images.
  - 1 preset has a remote image URL.
- Catalog schema gap:
  - JSON uses `id`, `bank`, `bankName`, `name`, `type`.
  - Target schema expects `presetId`, `providerCode`, `providerName`, `displayName`, `network`, `active`.
  - JSON has no `active` or `sortOrder` field yet.

## Preset Classification

| Preset | Classification | Notes |
| --- | --- | --- |
| `vcb-visa-platinum` | Valid | Source returned HTTP 200 and fee hint matched `800000`. Image is generated fallback because `imageUrl` is `null`. Needs future schema normalization. |
| `vcb-vibe-platinum` | Valid | Source returned HTTP 200 and fee hint matched `800000`. Image is generated fallback. Needs future schema normalization. |
| `techcombank-visa-signature` | Valid | Source returned HTTP 200 and included fee hints for `1.499.000 VNĐ`. Image is generated fallback. Source also mentions waived fee conditions, so waiver metadata may need later verification. |
| `techcombank-priority-visa-signature` | Valid | Source returned HTTP 200 and included fee hints for `1.499.000 VNĐ`. Image is generated fallback. Benefits/waiver conditions need later business verification if used as structured metadata. |
| `vpbank-stepup-mastercard` | Missing information | Source returned HTTP 200, but crawler found no annual-fee hint. Current `annualFee` is numeric, but fee requires manual verification from official source. Image is generated fallback. |
| `vpbank-shopee-platinum` | Needs correction | Source returned HTTP 200 and page text says this card has stopped accepting registrations. Current catalog has no `active` field and runtime treats it as active. Should be reviewed for deprecation/inactive status in CC-005 or later. Fee appears as free in broad source hints but needs product-specific verification. |
| `hsbc-cashback` | Valid | Source returned HTTP 200 and fee hint matched `800000`. Image is generated fallback. |
| `hsbc-livefree` | Valid | Source returned HTTP 200 and fee hint matched `350000`. Image is generated fallback. |
| `hsbc-liveplus` | Valid | Source returned HTTP 200 and fee hint matched `800000`. Image is generated fallback. |
| `sacombank-jcb-ultimate` | Needs correction | Source returned HTTP 200 and fee hint matched `1.699.000 VND`. Current `imageUrl` contains `thum-tin-dung-amex.png`, which appears to be an American Express thumbnail for a JCB product. Not changed in this batch because no verified replacement image was established. |
| `sacombank-visa-signature` | Missing information | Source returned HTTP 200, but crawler found no annual-fee hint on the broad listing URL. Current `annualFee` is numeric, but fee requires product-specific verification. Image is generated fallback. |
| `acb-visa-platinum` | Missing information | Source returned HTTP 200, but crawler found no annual-fee hint. Current `annualFee` is numeric, but fee requires manual verification. Image is generated fallback. |
| `acb-visa-signature` | Missing information | Source returned HTTP 200, but crawler found no annual-fee hint. Current `annualFee` is numeric, but fee requires manual verification. Image is generated fallback. |
| `mb-visa-modern-youth` | Missing information | Source returned HTTP 403. `annualFee` is explicitly `null`, which is appropriate for unknown fee. Image is generated fallback. |

## Detailed Checks

### Duplicate or Near-Duplicate Products

- No exact duplicate ids found.
- Similar names exist across providers, such as `Visa Platinum` and `Visa Signature`; these are expected and not duplicates because provider differs.
- Similar Techcombank products exist:
  - `techcombank-visa-signature`
  - `techcombank-priority-visa-signature`
  They appear to represent different products or customer segments and should remain distinct unless official source review proves otherwise.

### Provider Checks

Provider codes are stable-looking abbreviations, but they are not yet stored under target field name `providerCode`.

Provider values needing future review:

- `MBB` with display name `MB Bank`: acceptable as a code/display pair, but should be confirmed before schema normalization.
- `STB` with display name `Sacombank`: acceptable as a code/display pair.

### Network Checks

Current `type` values are payment networks only in the JSON:

- `Visa`
- `Mastercard`
- `JCB`

No current preset uses `type` for a full Card Product name.

### Annual Fee Checks

- Numeric type is valid for known fee values.
- `null` is valid for unknown fee values.
- The following numeric values were not confirmed by crawler hints and need manual verification:
  - `vpbank-stepup-mastercard`: `499000`
  - `sacombank-visa-signature`: `599000`
  - `acb-visa-platinum`: `899000`
  - `acb-visa-signature`: `1900000`
- `mb-visa-modern-youth` keeps `annualFee: null` because the source returned HTTP 403.

### Image Checks

- Most products use generated fallback card images through `lib/cardPresets.ts`.
- `sacombank-jcb-ultimate` has a remote URL ending in `thum-tin-dung-amex.png`; this is suspicious for a JCB product and should be corrected only after a verified JCB image URL is available.

### Source URL Checks

Results from `node scripts/crawl-card-presets.mjs`:

| Preset | HTTP status | Result |
| --- | ---: | --- |
| `vcb-visa-platinum` | 200 | Reachable |
| `vcb-vibe-platinum` | 200 | Reachable |
| `techcombank-visa-signature` | 200 | Reachable |
| `techcombank-priority-visa-signature` | 200 | Reachable |
| `vpbank-stepup-mastercard` | 200 | Reachable |
| `vpbank-shopee-platinum` | 200 | Reachable |
| `hsbc-cashback` | 200 | Reachable |
| `hsbc-livefree` | 200 | Reachable |
| `hsbc-liveplus` | 200 | Reachable |
| `sacombank-jcb-ultimate` | 200 | Reachable |
| `sacombank-visa-signature` | 200 | Reachable, but broad listing URL |
| `acb-visa-platinum` | 200 | Reachable |
| `acb-visa-signature` | 200 | Reachable |
| `mb-visa-modern-youth` | 403 | Needs verification or alternative official source |

## Issues To Carry Forward

- Normalize JSON field names in CC-005 without breaking legacy consumers.
- Add explicit `active` status. `vpbank-shopee-platinum` likely needs inactive/deprecated review because the official page text says it stopped accepting registrations.
- Verify all fees whose source pages did not expose crawler fee hints.
- Replace the suspicious Sacombank JCB Ultimate image only with a verified official JCB product image.
- Add automated catalog validation in a later task.
