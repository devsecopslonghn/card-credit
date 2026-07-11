import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getCatalogProductDetailResponse,
  getCatalogProductsResponse,
  getCatalogProvidersResponse,
} from "../lib/api/cardCatalogApi.mjs";

test("GET providers response returns active provider groups", () => {
  const response = getCatalogProvidersResponse();

  assert.equal(Array.isArray(response.data), true);
  assert.equal(response.data.some((provider) => provider.providerCode === "STB"), true);
  assert.equal(response.data.some((provider) => provider.products.some((product) => product.active === false)), false);
});

test("GET products filters by provider code case-insensitively", () => {
  const response = getCatalogProductsResponse("stb");

  assert.equal(response.data.length > 0, true);
  assert.equal(response.data.every((product) => product.providerCode === "STB"), true);
});

test("GET products excludes inactive products", () => {
  const response = getCatalogProductsResponse();
  const presetIds = response.data.map((product) => product.presetId);

  assert.equal(presetIds.includes("vpbank-shopee-platinum"), false);
});

test("GET product detail returns active product without legacy aliases", () => {
  const response = getCatalogProductDetailResponse("sacombank-visa-platinum-cashback");

  assert.equal(response.data.presetId, "sacombank-visa-platinum-cashback");
  assert.equal(response.data.providerCode, "STB");
  assert.equal("bank" in response.data, false);
  assert.equal("name" in response.data, false);
  assert.equal("type" in response.data, false);
});

test("GET product detail for missing preset returns 404-like error", () => {
  assert.throws(
    () => getCatalogProductDetailResponse("missing-preset"),
    (error) => error.status === 404 && error.code === "PRESET_NOT_FOUND",
  );
});

test("GET products for provider without active products returns 404-like error", () => {
  assert.throws(
    () => getCatalogProductsResponse("UNKNOWN"),
    (error) => error.status === 404 && error.code === "PROVIDER_NOT_FOUND",
  );
});
