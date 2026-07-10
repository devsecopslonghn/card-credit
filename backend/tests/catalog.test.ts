import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { CatalogRepository } from "../src/catalog.js";

const catalog = new CatalogRepository("../frontend/data");

test("serves public catalog contracts", async () => {
  const app = buildApp({ isReady: () => false }, "silent", catalog);
  const providers = await app.inject({ url: "/api/card-catalog/providers" });
  assert.equal(providers.statusCode, 200);
  assert.ok(providers.json().data.length > 0);
  const products = await app.inject({ url: "/api/card-catalog/products?provider=STB" });
  assert.equal(products.statusCode, 200);
  assert.ok(products.json().data.every((item: { providerCode: string }) => item.providerCode === "STB"));
  const missing = await app.inject({ url: "/api/card-catalog/products/missing" });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().error.code, "PRESET_NOT_FOUND");
  await app.close();
});
