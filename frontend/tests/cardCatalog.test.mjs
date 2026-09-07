import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import products from "../data/card-presets.json" with { type: "json" };
import {
  CARD_IMAGE_PLACEHOLDER_URL,
  createCatalogService,
  getCatalogImageUrl,
  validateCatalogProducts,
} from "../lib/cardCatalogCore.mjs";
import { parseDuplicateGroups } from "../lib/api/cardDuplicatesCore.mjs";
import { readCatalogJson } from "../lib/catalogValidation.mjs";

test("catalog validation detects duplicate presetId", () => {
  const duplicate = [{ ...products[0] }, { ...products[0] }];
  const issues = validateCatalogProducts(duplicate);

  assert.equal(issues.some((issue) => issue.code === "DUPLICATE_PRESET_ID"), true);
});

test("getPresetById returns the expected product", () => {
  const service = createCatalogService(products);
  const product = service.getPresetById("sacombank-visa-platinum-cashback");

  assert.equal(product?.providerCode, "STB");
  assert.equal(product?.displayName, "Visa Platinum Cashback");
});

test("active product filtering excludes inactive products", () => {
  const service = createCatalogService(products);
  const activeIds = service.getActiveCatalogProducts().map((product) => product.presetId);

  assert.equal(activeIds.includes("vpbank-shopee-platinum"), false);
});

test("groupProductsByProvider groups and sorts providers and products", () => {
  const service = createCatalogService(products);
  const groups = service.groupProductsByProvider();
  const providerNames = groups.map((group) => group.providerName);
  const sortedProviderNames = [...providerNames].sort((left, right) => left.localeCompare(right));
  const sacombankGroup = groups.find((group) => group.providerCode === "STB");
  const sacombankSortOrders = sacombankGroup.products.map((product) => product.sortOrder);

  assert.deepEqual(providerNames, sortedProviderNames);
  assert.deepEqual(sacombankSortOrders, [...sacombankSortOrders].sort((left, right) => left - right));
});

test("annualFee null is accepted", () => {
  const issues = validateCatalogProducts(products);
  const mbAnnualFeeIssues = issues.filter(
    (issue) => issue.presetId === "mb-visa-modern-youth" && issue.field === "annualFee",
  );

  assert.deepEqual(mbAnnualFeeIssues, []);
});

test("image fallback uses stable placeholder for missing imageUrl", () => {
  const product = products.find((item) => item.presetId === "mb-visa-modern-youth");

  assert.equal(getCatalogImageUrl(product), CARD_IMAGE_PLACEHOLDER_URL);
});

test("manifest cached image takes precedence over the catalog image URL", () => {
  const product = products.find((item) => item.presetId === "mb-visa-modern-youth");

  assert.equal(
    getCatalogImageUrl(product, {
      [product.presetId]: { status: "cached", localPath: "/card-images/mb-visa-modern-youth.webp" },
    }),
    "/card-images/mb-visa-modern-youth.webp",
  );
});

test("catalog JSON loading rejects malformed required input instead of returning an empty catalog", async () => {
  const directory = await mkdtemp(join(tmpdir(), "card-credit-catalog-"));
  const malformedPath = join(directory, "card-presets.json");
  await writeFile(malformedPath, "{ malformed json", "utf8");

  await assert.rejects(readCatalogJson(malformedPath), SyntaxError);
});

test("catalog JSON loading keeps the optional manifest fallback", async () => {
  const missingPath = join(tmpdir(), "card-credit-missing-manifest.json");

  assert.deepEqual(await readCatalogJson(missingPath, {}), {});
});

test("duplicate client parses canonical groups and maps card ids to the UI compatibility shape", () => {
  const card = (id) => ({
    _id: id,
    presetId: "preset-a",
    providerCode: "BANK",
    providerName: "Bank",
    displayName: "Card",
    network: "Visa",
    legacy: false,
    owner: "Tôi",
    imageUrl: null,
    annualFee: null,
    targetSpendForWaiver: null,
    annualFeeWaiverTarget: null,
    statementDay: null,
    paymentDueDays: null,
    cashbackCapAmount: null,
    cashbackCapPeriod: null,
    active: true,
    reminderEnabled: true,
    reminderDaysBefore: [],
    reminderTimezone: null,
    reminderTime: null,
    statementDate: null,
    paymentDueDate: null,
    amountDueThisMonth: null,
    isPaidThisMonth: null,
    monthlyData: [],
  });
  const groups = parseDuplicateGroups([{
    fingerprint: "workspace::preset-a::Tôi",
    workspaceId: "must-not-leak",
    presetId: "preset-a",
    normalizedOwner: "Tôi",
    reason: "Exact duplicate",
    cards: [card("card-1"), card("card-2")],
  }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].cards[0]._id, "card-1");
  assert.equal("workspaceId" in groups[0], false);
});
