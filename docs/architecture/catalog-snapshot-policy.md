# Catalog Snapshot Policy

Last reviewed: 2026-07-05

This document is the source of truth for how Card Product catalog data relates to existing User Cards.

## Core Rule

A User Card stores a catalog snapshot at creation time. Later catalog edits must not silently rewrite existing User Card data.

Read APIs must not mutate the database. Any future operation that updates snapshot fields must be explicit and must provide a dry-run or preview before applying changes.

## Snapshot Fields

### `annualFee`

`annualFee` is a financial snapshot copied from the Card Product when the User Card is created.

If the catalog annual fee changes later, existing User Cards keep their stored `annualFee`. Monthly data, payment data and historical report calculations must never be overwritten by catalog data.

Unknown fees are stored as `null`. Reports may treat unknown annual fees as `0` for aggregate calculations only, while preserving `annualFee: null` in card output and exposing an explicit known/unknown signal.

### `providerName`

`providerName` is copied from the catalog when the User Card is created.

Catalog provider renames do not automatically update existing User Cards. Existing cards may only receive updated provider display metadata through an explicit sync operation with dry-run or preview.

### `displayName`

`displayName` is copied from the catalog when the User Card is created.

Catalog product name corrections do not automatically update existing User Cards. Existing cards may only receive updated display metadata through an explicit sync operation with dry-run or preview.

### `network`

`network` is copied from the catalog when the User Card is created and represents the payment network only.

Catalog network corrections do not automatically update existing User Cards. A future sync must treat network changes as identity-sensitive and show them in dry-run or preview output before applying.

### `imageUrl`

`imageUrl` is copied from the catalog image resolver when the User Card is created.

Catalog image changes, cache changes or placeholder changes do not automatically update existing User Cards. Existing card image metadata may only be refreshed through an explicit sync operation with dry-run or preview.

### `sourceUrl`

`sourceUrl` is catalog provenance metadata. The current User Card model does not persist `sourceUrl`.

If a future task adds `sourceUrl` to User Cards, it must follow the same snapshot rule: copy it at creation time, never update it from read paths, and only refresh it through an explicit sync operation with dry-run or preview.

### `catalogVersion`

`catalogVersion` records the catalog format or version used when a User Card snapshot is created.

Changing the catalog version does not imply existing cards are stale or eligible for automatic mutation. Any future version upgrade or snapshot refresh must be explicit, previewable and must not change operational or historical financial data.

## Inactive And Deprecated Products

Inactive or deprecated Card Products remain in the catalog for history, audit and compatibility.

Rules:

- Inactive presets must not be selectable for creating new User Cards.
- Existing User Cards created from an inactive or later-deprecated preset remain usable.
- Inactive status must not hide, delete or mutate existing User Cards.
- Reports, listing, detail pages, owner filtering, payment workflows and monthly-data workflows must continue to support cards created from inactive products.

## Legacy Cards

A Legacy Card is a User Card without `presetId`.

Legacy Cards remain valid. Read paths may serialize compatibility fallbacks such as:

```ts
const providerName = card.providerName ?? card.bank;
const displayName = card.displayName ?? card.name;
const network = card.network ?? card.type;
```

These fallbacks are response shaping only. Reading a Legacy Card must not map it to a preset, set `presetId`, update catalog fields or otherwise mutate the database.

## Sync Operations

There is currently no normal automatic catalog sync for User Cards.

Any future snapshot sync operation must:

- Be explicitly invoked.
- Provide dry-run or preview output before applying changes.
- Show which fields would change.
- Never overwrite `monthlyData`.
- Never overwrite current payment fields such as `statementDate`, `paymentDueDate`, `amountDueThisMonth` or `isPaidThisMonth`.
- Never overwrite historical financial data.
- Avoid mapping Legacy Cards to presets unless a separate reviewed migration task explicitly allows it.

Normal read APIs, report APIs and UI rendering must remain side-effect free.
