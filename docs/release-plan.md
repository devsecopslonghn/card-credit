# Catalog-First Release Plan

This checklist is the compatibility-first rollout plan for the card catalog migration.

## Scope

This release moves card creation to the catalog-first contract while keeping legacy cards and the legacy create contract usable during the transition.

In scope:

- JSON-backed Card Catalog.
- Catalog API.
- Catalog-first `POST /api/cards`.
- Backward-compatible User Card schema and serializers.
- Legacy-card migration dry-run and exact-match apply.
- Catalog-first cards UI.

Out of scope:

- Authentication and authorization rollout.
- MongoDB-backed catalog administration.
- Removing legacy `bank`, `name`, `type` fields.
- Removing the deprecated legacy `POST /api/cards` contract.

## Roles

- Release owner: coordinates go/no-go, records timestamps and approvers.
- Database owner: creates backup, verifies restore procedure and runs migration commands.
- Application owner: deploys app image and watches application logs.
- QA owner: runs smoke tests and signs off listing, detail and report behavior.

## Pre-Release Checklist

- [ ] Confirm target commit SHA and Docker image tag.
- [ ] Confirm `MONGODB_URI` points to the intended environment.
- [ ] Confirm no production migration is run from a developer laptop.
- [ ] Confirm current production image tag for rollback.
- [ ] Confirm current production environment variables are backed up.
- [ ] Run quality gates on the release candidate:

```bash
npm ci
npm run validate:catalog
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run build
npm run prepare:card-images
```

- [ ] Confirm Jenkins pipeline passed through container smoke test.

## Backup And Restore Verification

Before any deploy or migration:

- [ ] Create a MongoDB backup using the environment-approved backup method.
- [ ] Record backup id, timestamp, database name and operator.
- [ ] Verify the backup is readable.
- [ ] Verify restore procedure in a non-production database or document the managed restore workflow.
- [ ] Record restore verification evidence and approver.

Example self-managed backup command:

```bash
mongodump --uri "$MONGODB_URI" --archive="backup-$(date +%Y%m%d-%H%M%S).archive" --gzip
```

Example restore rehearsal to a non-production URI:

```bash
mongorestore --uri "$RESTORE_TEST_MONGODB_URI" --archive="backup.archive" --gzip --drop
```

Do not proceed to migration apply unless backup restore is verified or an approved managed restore process is documented.

## Rollout Steps

### 1. Deploy Compatible Schema

- [ ] Deploy code that can read both legacy cards and catalog cards.
- [ ] Confirm old card fields remain present:
  - `bank`
  - `name`
  - `type`
  - `imageUrl`
  - `annualFee`
  - payment fields
  - `monthlyData`
- [ ] Confirm new optional fields do not break legacy documents:
  - `presetId`
  - `providerCode`
  - `providerName`
  - `displayName`
  - `network`
  - `catalogVersion`
  - `legacy`

### 2. Deploy Catalog API

- [ ] Deploy `/api/card-catalog/providers`.
- [ ] Deploy `/api/card-catalog/products`.
- [ ] Deploy `/api/card-catalog/products/:presetId`.
- [ ] Smoke test catalog endpoints:

```bash
curl -fsS "$BASE_URL/api/card-catalog/providers"
curl -fsS "$BASE_URL/api/card-catalog/products?provider=STB"
curl -fsS "$BASE_URL/api/card-catalog/products/sacombank-visa-platinum-cashback"
```

### 3. Deploy New Card Create API

- [ ] Confirm catalog-first create accepts only:

```json
{
  "presetId": "sacombank-visa-platinum-cashback",
  "owner": "Long Ho"
}
```

- [ ] Confirm client-supplied product metadata cannot override catalog snapshot fields.
- [ ] Confirm deprecated legacy create still works during transition and returns `X-Deprecated-Contract: legacy-card-create`.

### 4. Smoke Test API

- [ ] `GET /api/cards` returns existing legacy cards.
- [ ] `GET /api/reports/summary` returns legacy and catalog-compatible fields.
- [ ] Invalid catalog create returns structured errors.
- [ ] API errors do not expose stack traces.

### 5. Migration Dry-Run

Run dry-run first and save the report:

```bash
MONGODB_URI="$MONGODB_URI" npm run migrate:catalog -- --dry-run --output migration-dry-run.json
```

Review required:

- [ ] `exact` count is reasonable.
- [ ] `probable` cards are not applied automatically.
- [ ] `ambiguous` cards are not applied automatically.
- [ ] `unmatched` cards are retained as legacy.
- [ ] `wouldUpdate` card ids are reviewed by database owner and application owner.
- [ ] Dry-run report is attached to the release record.

### 6. Migration Apply

Apply only after dry-run approval:

```bash
MONGODB_URI="$MONGODB_URI" npm run migrate:catalog -- --apply --output migration-apply.json
```

Apply expectations:

- [ ] Exact matches only are updated.
- [ ] `monthlyData` is unchanged.
- [ ] Payment fields are unchanged.
- [ ] `annualFee` and `imageUrl` legacy snapshots are preserved.
- [ ] Cards without safe match remain visible as legacy.

### 7. Deploy Catalog-First UI

- [ ] Deploy UI with provider picker.
- [ ] Deploy product picker.
- [ ] Deploy owner-only create form.
- [ ] Confirm UI sends `presetId + owner` only.
- [ ] Confirm inactive products do not appear in the add-card flow.

### 8. Smoke Test UI

QA owner signs off:

- [ ] `/cards` loads.
- [ ] Existing legacy card is visible with fallback provider/product/network.
- [ ] Add card modal opens.
- [ ] Sacombank appears as a provider.
- [ ] Visa Platinum Cashback can be selected.
- [ ] Owner validation blocks empty owner.
- [ ] New card appears under the correct provider section.
- [ ] Card detail opens for legacy and catalog cards.
- [ ] Operational field update works.
- [ ] Mark paid works.
- [ ] Report summary includes legacy and catalog cards.

### 9. Monitor

Watch logs for at least one agreed observation window:

- [ ] Catalog load failures.
- [ ] Preset lookup failures.
- [ ] Card creation failures.
- [ ] Deprecated legacy create usage.
- [ ] Migration errors.
- [ ] Database errors.

Record:

- Observation start time.
- Observation end time.
- Any errors and resolution.
- Final go/no-go decision.

## Rollback Procedure

Rollback is allowed at any step if smoke tests fail, migration output is unexpected or production logs show severe errors.

### App Rollback

- [ ] Re-deploy the previous known-good Docker image tag.
- [ ] Restore previous environment variables if they changed.
- [ ] Confirm `/cards` and `/api/cards` return successfully.
- [ ] Keep database backup untouched until incident review is complete.

### Migration Rollback

Preferred rollback:

- [ ] Restore MongoDB from the verified backup.
- [ ] Re-run smoke tests against restored data.

Targeted rollback when full restore is not acceptable:

- [ ] Use the reviewed migration apply report to identify exact changed card ids.
- [ ] Unset catalog migration fields only for those ids:
  - `presetId`
  - `providerCode`
  - `providerName`
  - `displayName`
  - `network`
  - `catalogVersion`
- [ ] Set `legacy: true` for those ids.
- [ ] Do not modify:
  - `bank`
  - `name`
  - `type`
  - `annualFee`
  - `imageUrl`
  - payment fields
  - `monthlyData`

Example targeted rollback shape:

```javascript
db.creditcards.updateMany(
  { _id: { $in: [ObjectId("...")] } },
  {
    $unset: {
      presetId: "",
      providerCode: "",
      providerName: "",
      displayName: "",
      network: "",
      catalogVersion: ""
    },
    $set: { legacy: true }
  }
)
```

Targeted rollback must be approved by the database owner and application owner.

## Compatibility Guarantees

- Legacy cards remain readable.
- Legacy cards remain visible in listing, detail and report.
- Legacy fields are not removed in this release.
- Catalog-first create snapshots product metadata on the server.
- Legacy create remains temporarily available for old clients.
- Preset inactive status blocks new creation but does not hide existing cards.
- Report output keeps compatibility fields for consumers that still read `bank`, `name` or `type`.

## Release Record Template

```text
Release:
Commit:
Docker image:
Environment:
Backup id:
Backup restore verified by:
Dry-run report:
Apply report:
Smoke test signed off by:
Migration approved by:
Released by:
Started at:
Completed at:
Rollback image:
Notes:
```
