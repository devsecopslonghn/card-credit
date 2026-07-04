# AGENTS.md

## 1. Purpose

This file defines the mandatory working rules for AI coding agents in the `card-credit` repository.

The authoritative implementation backlog and Definition of Done are maintained in:

```text
docs/card-catalog-roadmap.md
```

Before making any change, read this file and the assigned task in the roadmap.

---

## 2. Working principles

For every task:

1. Inspect the actual repository and affected files before proposing changes.
2. Read the task description, dependencies, and Definition of Done.
3. Keep the change limited to the assigned task.
4. Preserve backward compatibility unless the task explicitly requires a breaking change.
5. Do not invent business data, product metadata, fees, URLs, or migration mappings.
6. Prefer small, reviewable commits over broad rewrites.
7. Run the relevant validation commands before reporting completion.
8. Report incomplete items honestly.

Do not claim that a command passed unless it was actually executed.

When requirements are ambiguous:

- Inspect the current implementation first.
- Prefer the least destructive interpretation.
- Document assumptions.
- Do not guess financial or product data.
- Ask for confirmation before destructive changes or irreversible migrations.

---

## 3. Repository workflow

Work on the user-designated AI task branch.

Recommended branch format:

```text
ai-task/<task-or-milestone-name>
```

Examples:

```text
ai-task/card-catalog-foundation
ai-task/catalog-backend
ai-task/catalog-ui
```

Do not:

- Work directly on `main` or `master`.
- Merge branches.
- Force-push.
- Rewrite unrelated history.
- Delete user data.
- Run production migrations.
- Change secrets or production environment values.

The agent may commit and push only when explicitly instructed.

Before editing, run or inspect:

```bash
git status
git branch --show-current
git log -5 --oneline
```

If the working tree already contains user changes, do not overwrite them.

---

## 4. Project direction

The project is moving from manually entered credit-card metadata to a catalog-first model.

Target domain:

```text
Provider
  └── Card Product
        ├── Network
        ├── Annual fee
        ├── Image URL
        ├── Source URL
        └── Active status

User Credit Card
  ├── Selected Card Product
  └── Cardholder-specific information
```

Use these terms consistently:

- `Provider`: card issuer, such as Sacombank.
- `Card Product`: a predefined product issued by a Provider.
- `Network`: Visa, Mastercard, JCB, American Express, and similar networks.
- `CreditCard` or `User Card`: a specific card owned by the application user.
- `Catalog`: centralized Card Product definitions.
- `Snapshot`: product information copied to a User Card when it is created.
- `Legacy Card`: an existing card that is not yet linked to a catalog preset.

Do not use `CardType` to represent both a Network and a Card Product.

---

## 5. Current catalog source of truth

During the first implementation milestones, the Card Product catalog source of truth is expected to be:

```text
data/card-presets.json
lib/cardPresets.ts
```

If the actual source structure differs, document the difference before changing it.

Do not introduce a MongoDB-backed Provider or Card Product catalog until the assigned roadmap task explicitly requests it.

UI and API code must not independently parse, normalize, group, or mutate the catalog JSON.

Catalog access should go through typed helpers or a catalog service, such as:

```ts
getAllCatalogProducts()
getActiveCatalogProducts()
getCatalogProviders()
getProductsByProvider(providerCode)
getPresetById(presetId)
groupProductsByProvider()
```

Do not mutate the original catalog data.

---

## 6. Catalog data rules

Each active Card Product should contain:

```text
presetId
providerCode
providerName
displayName
network
annualFee
imageUrl
sourceUrl
sourceCheckedAt
active
```

Optional fields may include:

```text
segment
targetSpendForWaiver
sortOrder
catalogVersion
```

Conventions:

- `presetId`: lowercase kebab-case and globally unique.
- `providerCode`: uppercase, stable identifier.
- `displayName`: official product display name.
- `network`: payment network only, not the product tier or full product name.
- `annualFee`: number or explicit `null`.
- `active`: required boolean.
- `sourceCheckedAt`: ISO date or the agreed repository format.
- Unknown values must be represented explicitly; never fabricate them.
- Inactive products must not appear in the normal add-card flow.

Product fees, names, images, networks, and source URLs must not be guessed.

When data cannot be verified:

- Leave the field as `null` or the supported unknown value.
- Mark it as needing verification in the audit document.
- Do not silently fill it with an example value.

---

## 7. Card creation contract

The target card creation request is:

```json
{
  "presetId": "sacombank-visa-platinum-cashback",
  "owner": "Long Ho"
}
```

The server must resolve and validate all Card Product metadata from the catalog.

The client is not the source of truth for:

```text
providerCode
providerName
displayName
network
annualFee
imageUrl
sourceUrl
```

The client must not be able to override these fields during normal card creation.

Do not directly pass an unvalidated request body to database operations such as:

```ts
CreditCard.create(requestBody)
CreditCard.findByIdAndUpdate(id, requestBody)
```

Use:

- Request validation.
- Explicit input types.
- Explicit field allowlists.
- A service layer for business logic where appropriate.

---

## 8. Backward compatibility

Existing CreditCard documents must continue to work during the transition.

Do not remove existing fields in the initial catalog implementation:

```text
bank
name
type
imageUrl
annualFee
```

New records may also contain:

```text
presetId
providerCode
providerName
displayName
network
catalogVersion
legacy
```

When reading cards, support compatibility fallbacks:

```ts
const providerName = card.providerName ?? card.bank;
const displayName = card.displayName ?? card.name;
const network = card.network ?? card.type;
```

A card without `presetId` is a Legacy Card.

Legacy Cards must remain usable in:

- Card listing.
- Card detail.
- Owner filtering.
- Upcoming payments.
- Reports.
- Export.
- Payment and monthly-data workflows.

Never hide, delete, or silently remap unmatched legacy data.

---

## 9. Snapshot policy

A User Card stores a snapshot of important Card Product information at creation time.

Default policy:

- Preserve annual-fee snapshots.
- Preserve historical financial data.
- Preserve payment and monthly data.
- Do not silently update existing fees because the catalog changed.
- An inactive Card Product cannot be selected for a new card.
- Existing User Cards created from an inactive product must continue to work.
- Catalog synchronization must be an explicit operation, not an automatic side effect.

If the task changes this policy, update:

```text
docs/catalog-snapshot-policy.md
```

and add tests for the changed behavior.

---

## 10. Update restrictions

Normal User Card updates may modify operational or cardholder fields such as:

```text
owner
targetSpendForWaiver
statementDate
paymentDueDate
amountDueThisMonth
isPaidThisMonth
monthlyData
```

Normal update routes must not directly modify Card Product identity fields:

```text
presetId
providerCode
providerName
displayName
network
annualFee
imageUrl
```

Changing a User Card to a different Card Product requires a separate, explicit business operation.

---

## 11. Owner data rules

Normalize owner values conservatively:

- Trim leading and trailing whitespace.
- Collapse repeated internal whitespace.
- Preserve Vietnamese characters.
- Do not unexpectedly uppercase or rewrite names.
- Reject empty or whitespace-only values.
- Apply a documented maximum length.

Do not treat formatting differences caused only by extra whitespace as different owners.

---

## 12. UI rules

The normal add-card flow must be:

```text
Select Provider
  → Select Card Product
  → Review product information
  → Enter cardholder information
  → Create User Card
```

The normal user should not manually enter:

- Provider name.
- Product name.
- Network.
- Annual fee.
- Image URL.
- Product image file.

The product preview should show:

- Card image or fallback.
- Provider.
- Product display name.
- Network.
- Annual fee.

Card listing requirements:

- Group User Cards by Provider.
- Support Legacy Card fallback using existing fields.
- Use a responsive flex or equivalent adaptive layout.
- Avoid horizontal scrolling on common mobile widths.
- Handle long product names.
- Use a stable placeholder for broken images.

Do not redesign unrelated pages unless the assigned task requires it.

---

## 13. Accessibility

New or modified interactive UI must support:

- Keyboard-only operation.
- Visible focus.
- Proper form labels.
- Accessible names for icon-only buttons.
- Semantic heading hierarchy.
- Useful image alternative text.
- Error messages associated with their fields.
- Status communication that does not rely only on color.

Modal requirements:

- `role="dialog"`.
- `aria-modal="true"`.
- Focus moves into the modal when opened.
- Focus remains inside while open.
- Escape closes the modal when safe.
- Focus returns to the trigger after closing.

---

## 14. Image handling

Prefer catalog-managed image URLs and controlled local fallbacks.

Do not store new card images as large base64 strings in CreditCard documents.

Image failures must not:

- Break the page layout.
- Crash catalog loading.
- Fail the entire application build unless validation explicitly requires it.

Build-time image tooling should:

- Record download failures.
- Produce or use a placeholder.
- Behave consistently in local, Docker, and CI environments.
- Avoid deleting required source assets during cleanup.

---

## 15. Migration safety

All database migration tasks must support dry-run mode.

Expected pattern:

```bash
npm run migrate:catalog -- --dry-run
npm run migrate:catalog -- --apply
```

Migration matching states should include:

```text
exact
probable
ambiguous
unmatched
```

Default rules:

- Only exact matches may be applied automatically.
- Probable, ambiguous, and unmatched records must be reported for review.
- Dry-run must not modify the database.
- Migration must be idempotent.
- Migration must be safe to rerun.
- Migration must not modify `monthlyData`.
- Migration must not modify current payment information.
- Migration must log which records would change or were changed.
- Never run apply mode against production unless explicitly instructed.

Do not create a destructive migration without:

- Backup requirements.
- Rollback steps.
- A reviewed dry-run.
- An explicit task requiring it.

---

## 16. API conventions

API changes must include:

- Validated request input.
- Explicit response shape.
- Consistent HTTP status codes.
- Consistent error format.
- Server-side product lookup.
- No internal stack trace exposed to clients.
- Logging with enough context for investigation.

Suggested error shape:

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

Use status codes consistently:

- `400`: invalid input.
- `404`: resource or preset not found.
- `409`: business conflict.
- `500`: unexpected server failure.

Preserve existing API compatibility until the roadmap explicitly allows removal.

---

## 17. Testing requirements

Add tests appropriate to the assigned task.

Expected categories:

- Catalog unit tests.
- Owner normalization unit tests.
- API integration tests.
- Migration tests.
- Component tests.
- End-to-end tests for the main add-card flow.
- Legacy compatibility tests.

Tests must:

- Be deterministic.
- Avoid external network dependencies where possible.
- Avoid production databases.
- Clean up their data.
- Cover success and important failure cases.

Do not add a testing framework that conflicts with the existing project setup without documenting the reason.

---

## 18. Validation commands

Inspect `package.json` before choosing commands.

Run all relevant commands that exist, for example:

```bash
npm install
npm run validate:catalog
npm run typecheck
npm run lint
npm run test
npm run test:unit
npm run test:integration
npm run build
```

Do not assume every command already exists.

If a required command is missing:

- Add it only when the assigned task requires that capability.
- Otherwise report that it is unavailable.

For every failed command, report:

- The exact command.
- The relevant error.
- Whether it appears to be pre-existing.
- Whether it blocks the Definition of Done.

---

## 19. Scope control

Before implementation:

1. Read `AGENTS.md`.
2. Read the assigned roadmap task.
3. Inspect affected code, tests, manifests, and documentation.
4. Identify dependencies and backward-compatibility constraints.
5. Check current `git status`.
6. State the planned file-level scope.

Do not:

- Perform unrelated refactors.
- Reformat the entire repository.
- Rename public fields without a compatibility plan.
- Remove legacy fields prematurely.
- Guess business data.
- Hard-delete catalog products referenced by existing cards.
- Edit generated files when a source or generator exists.
- Replace working infrastructure without an assigned requirement.
- Update dependencies broadly without justification.
- Mark roadmap tasks complete without checking every Definition of Done item.

If an unrelated issue is discovered, report it separately instead of silently expanding scope.

---

## 20. Roadmap task workflow

For an assigned task or batch:

1. Identify the task IDs.
2. Read their descriptions and Definition of Done.
3. Inspect the actual implementation.
4. Write a short implementation plan.
5. Implement only the required changes.
6. Add or update tests.
7. Run validation.
8. Review the diff.
9. Check every Definition of Done item.
10. Produce a completion report.

Do not begin later milestones merely because they appear related.

Respect milestone order unless the user explicitly changes priority:

1. Catalog foundation.
2. Catalog-first backend.
3. Catalog-first UI.
4. Migration and testing.
5. Production hardening.
6. Database-backed admin catalog.

---

## 21. Documentation

Update documentation whenever a task changes:

- Domain terminology.
- API contracts.
- Data schema.
- Environment variables.
- Local setup.
- Testing commands.
- Migration behavior.
- Deployment behavior.
- Snapshot policy.

Do not leave documentation claiming behavior that the code no longer implements.

Roadmap task statuses may be updated only after their Definition of Done has been checked against actual results.

---

## 22. Security

Never commit:

- Secrets.
- Passwords.
- API tokens.
- Private keys.
- Production connection strings.
- Real card numbers.
- Sensitive cardholder information.

Use safe sample data.

The application must not store full payment card numbers, CVV values, or other sensitive authentication data unless a future explicitly reviewed security design requires it.

Do not log secrets or unnecessary personal data.

---

## 23. Completion report

End every task with this format:

```text
Task:
Status: completed | partially completed | blocked

Implemented:
- ...

Files changed:
- ...

Validation executed:
- command: passed | failed | not available
- command: passed | failed | not available

Definition of Done:
- [x] Completed requirement
- [ ] Incomplete requirement — reason

Backward-compatibility impact:
- ...

Data or migration impact:
- ...

Existing issues discovered:
- ...

Known risks:
- ...

Assumptions:
- ...

Recommended next task:
- ...
```

A task is not complete merely because code was written.

It is complete only when:

- The implementation matches the assigned scope.
- The applicable Definition of Done is satisfied.
- Relevant validation has been executed.
- Compatibility and migration impacts are documented.
