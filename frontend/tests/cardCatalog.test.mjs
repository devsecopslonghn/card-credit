import assert from "node:assert/strict";
import { test } from "node:test";
import products from "../data/card-presets.json" with { type: "json" };
import {
  CARD_IMAGE_PLACEHOLDER_URL,
  createCatalogService,
  getCatalogImageUrl,
  toLegacyCardPreset,
  validateCatalogProducts,
} from "../lib/cardCatalogCore.mjs";

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

test("inactive product is not present in picker compatibility adapter", () => {
  const service = createCatalogService(products);
  const pickerIds = service.getLegacyCardPresets().map((preset) => preset.id);

  assert.equal(pickerIds.includes("vpbank-shopee-platinum"), false);
});

test("image fallback uses stable placeholder for missing imageUrl", () => {
  const product = products.find((item) => item.presetId === "mb-visa-modern-youth");

  assert.equal(getCatalogImageUrl(product), CARD_IMAGE_PLACEHOLDER_URL);
});

test("legacy compatibility adapter maps canonical fields", () => {
  const product = products.find((item) => item.presetId === "sacombank-platinum-american-express");
  const legacy = toLegacyCardPreset(product);

  assert.equal(legacy.id, product.presetId);
  assert.equal(legacy.bank, product.providerCode);
  assert.equal(legacy.bankName, product.providerName);
  assert.equal(legacy.name, product.displayName);
  assert.equal(legacy.type, product.network);
});
