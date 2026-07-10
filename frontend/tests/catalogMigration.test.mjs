import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCatalogMigrationReport,
  classifyCatalogMatch,
  runCatalogMigration,
} from "../lib/catalogMigrationCore.mjs";

const products = [
  {
    presetId: "stb-visa-platinum-cashback",
    providerCode: "STB",
    providerName: "Sacombank",
    displayName: "Visa Platinum Cashback",
    network: "Visa",
    catalogVersion: "json-v1",
  },
  {
    presetId: "stb-jcb-ultimate",
    providerCode: "STB",
    providerName: "Sacombank",
    displayName: "JCB Ultimate",
    network: "JCB",
  },
  {
    presetId: "vcb-visa-platinum",
    providerCode: "VCB",
    providerName: "Vietcombank",
    displayName: "Visa Platinum",
    network: "Visa",
    bank: "VCB",
    name: "Visa Platinum",
    type: "Visa",
  },
];

const clone = (value) => JSON.parse(JSON.stringify(value));

const applyInMemory = (cards) => async (cardId, update) => {
  const card = cards.find((item) => item._id === cardId);
  if (!card || card.presetId) return { matched: 0, modified: 0 };
  Object.assign(card, update);
  return { matched: 1, modified: 1 };
};

test("classifies exact match by provider, product name and network", () => {
  const result = classifyCatalogMatch(
    { _id: "card-1", bank: "STB", name: "Visa Platinum Cashback", type: "Visa" },
    products,
  );

  assert.equal(result.status, "exact");
  assert.equal(result.matchedPresetId, "stb-visa-platinum-cashback");
  assert.deepEqual(result.update, {
    presetId: "stb-visa-platinum-cashback",
    providerCode: "STB",
    providerName: "Sacombank",
    displayName: "Visa Platinum Cashback",
    network: "Visa",
    catalogVersion: "json-v1",
    legacy: false,
  });
});

test("classifies already migrated cards without remapping", () => {
  const result = classifyCatalogMatch(
    { _id: "card-2", presetId: "existing-preset", bank: "STB", name: "Old", type: "Visa" },
    products,
  );

  assert.equal(result.status, "already-migrated");
  assert.equal(result.matchedPresetId, "existing-preset");
  assert.equal(result.update, undefined);
});

test("classifies probable match for narrow normalized product-token fallback", () => {
  const result = classifyCatalogMatch(
    { _id: "card-3", bank: "Sacombank", name: "Visa Platinum Cashback Card", type: "visa" },
    products,
  );

  assert.equal(result.status, "probable");
  assert.equal(result.matchedPresetId, "stb-visa-platinum-cashback");
});

test("classifies ambiguous match when multiple presets share the same identity", () => {
  const result = classifyCatalogMatch(
    { _id: "card-4", bank: "STB", name: "JCB Ultimate", type: "JCB" },
    [
      ...products,
      {
        presetId: "duplicate-stb-jcb-ultimate",
        providerCode: "STB",
        providerName: "Sacombank",
        displayName: "JCB Ultimate",
        network: "JCB",
      },
    ],
  );

  assert.equal(result.status, "ambiguous");
  assert.deepEqual(
    result.matches.map((item) => item.presetId),
    ["stb-jcb-ultimate", "duplicate-stb-jcb-ultimate"],
  );
});

test("classifies unmatched card without assigning a preset", () => {
  const result = classifyCatalogMatch(
    { _id: "card-5", bank: "UNKNOWN", name: "Manual Travel Card", type: "Visa" },
    products,
  );

  assert.equal(result.status, "unmatched");
  assert.equal(result.matchedPresetId, null);
  assert.equal(result.update, undefined);
});

test("uses legacy catalog aliases as an exact fallback", () => {
  const result = classifyCatalogMatch(
    { _id: "card-6", bank: "VCB", name: "Visa Platinum", type: "Visa" },
    [
      {
        presetId: "vcb-legacy-alias",
        providerCode: "DIFFERENT",
        providerName: "Different Provider",
        displayName: "Different Display",
        network: "Mastercard",
        bank: "VCB",
        name: "Visa Platinum",
        type: "Visa",
      },
    ],
  );

  assert.equal(result.status, "exact");
  assert.equal(result.matchedPresetId, "vcb-legacy-alias");
});

test("dry-run reports updates without calling update", async () => {
  let calls = 0;
  const report = await runCatalogMigration({
    cards: [{ _id: "card-7", bank: "STB", name: "Visa Platinum Cashback", type: "Visa" }],
    products,
    updateCard: async () => {
      calls += 1;
      return { matched: 1, modified: 1 };
    },
  });

  assert.equal(report.summary.wouldUpdate, 1);
  assert.equal(report.applied.modified, 0);
  assert.equal(calls, 0);
});

test("apply updates only exact matches and preserves financial snapshots", async () => {
  const cards = [
    {
      _id: "exact-card",
      bank: "STB",
      name: "Visa Platinum Cashback",
      type: "Visa",
      annualFee: 123456,
      imageUrl: "data:image/svg+xml,<svg/>",
      owner: "Long Ho",
      statementDate: "2026-07-18",
      paymentDueDate: "2026-08-02",
      amountDueThisMonth: 5620000,
      isPaidThisMonth: false,
      monthlyData: [{ month: 1, spend: 100, cashback: 2, fee: 3, otherInterest: 4 }],
    },
    { _id: "probable-card", bank: "Sacombank", name: "Visa Platinum Cashback Card", type: "Visa" },
    { _id: "unmatched-card", bank: "UNKNOWN", name: "Manual Travel Card", type: "Visa", legacy: true },
    { _id: "already-card", presetId: "stb-jcb-ultimate", bank: "STB", name: "JCB Ultimate", type: "JCB", legacy: false },
  ];
  const beforeExact = clone(cards[0]);

  const report = await runCatalogMigration({
    cards,
    products,
    apply: true,
    updateCard: applyInMemory(cards),
  });

  assert.equal(report.applied.modified, 1);
  assert.equal(cards[0].presetId, "stb-visa-platinum-cashback");
  assert.equal(cards[0].providerCode, "STB");
  assert.equal(cards[0].providerName, "Sacombank");
  assert.equal(cards[0].displayName, "Visa Platinum Cashback");
  assert.equal(cards[0].network, "Visa");
  assert.equal(cards[0].legacy, false);

  assert.equal(cards[0].bank, beforeExact.bank);
  assert.equal(cards[0].name, beforeExact.name);
  assert.equal(cards[0].type, beforeExact.type);
  assert.equal(cards[0].annualFee, beforeExact.annualFee);
  assert.equal(cards[0].imageUrl, beforeExact.imageUrl);
  assert.equal(cards[0].owner, beforeExact.owner);
  assert.equal(cards[0].statementDate, beforeExact.statementDate);
  assert.equal(cards[0].paymentDueDate, beforeExact.paymentDueDate);
  assert.equal(cards[0].amountDueThisMonth, beforeExact.amountDueThisMonth);
  assert.equal(cards[0].isPaidThisMonth, beforeExact.isPaidThisMonth);
  assert.deepEqual(cards[0].monthlyData, beforeExact.monthlyData);

  assert.equal(cards[1].presetId, undefined);
  assert.equal(cards[2].presetId, undefined);
  assert.equal(cards[2].legacy, true);
  assert.equal(cards[3].presetId, "stb-jcb-ultimate");
});

test("apply is idempotent when run a second time", async () => {
  const cards = [{ _id: "card-8", bank: "STB", name: "Visa Platinum Cashback", type: "Visa" }];

  const first = await runCatalogMigration({
    cards,
    products,
    apply: true,
    updateCard: applyInMemory(cards),
  });
  const second = await runCatalogMigration({
    cards,
    products,
    apply: true,
    updateCard: applyInMemory(cards),
  });

  assert.equal(first.applied.modified, 1);
  assert.equal(second.summary.alreadyMigrated, 1);
  assert.equal(second.applied.modified, 0);
});

test("mixed legacy and catalog dataset summary is stable", () => {
  const report = buildCatalogMigrationReport(
    [
      { _id: "exact", bank: "STB", name: "Visa Platinum Cashback", type: "Visa" },
      { _id: "probable", bank: "Sacombank", name: "Visa Platinum Cashback Card", type: "Visa" },
      { _id: "unmatched", bank: "UNKNOWN", name: "Manual", type: "Visa" },
      { _id: "already", presetId: "stb-jcb-ultimate", bank: "STB", name: "JCB Ultimate", type: "JCB" },
    ],
    products,
  );

  assert.deepEqual(report.summary, {
    total: 4,
    exact: 1,
    probable: 1,
    ambiguous: 0,
    unmatched: 1,
    alreadyMigrated: 1,
    wouldUpdate: 1,
  });
});
