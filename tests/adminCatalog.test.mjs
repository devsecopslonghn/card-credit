import assert from "node:assert/strict";
import { test } from "node:test";
import { createAdminCatalogRouteHandlers } from "../lib/api/adminCatalogRouteCore.mjs";
import { serializeCreditCard } from "../lib/cards/serializerCore.mjs";
import { createCardFromPreset } from "../lib/services/cardService.mjs";

const admin = { userId: "admin", email: "admin@example.test", role: "admin", workspaceId: "admin" };
const user = { userId: "user", email: "user@example.test", role: "user", workspaceId: "user" };

const product = (overrides = {}) => ({
  presetId: "admin-test-card",
  providerCode: "ADM",
  providerName: "Admin Bank",
  displayName: "Admin Test Card",
  network: "Visa",
  segment: "Platinum",
  annualFee: 100000,
  targetSpendForWaiver: null,
  imageUrl: "/card-images/placeholder-card.svg",
  benefits: ["Admin test"],
  sourceUrl: "https://example.test/admin-test-card",
  sourceCheckedAt: "2026-07-05",
  active: true,
  sortOrder: 9901,
  theme: { background: "#111827", accent: "#f8fafc" },
  id: "admin-test-card",
  bank: "ADM",
  bankName: "Admin Bank",
  name: "Admin Test Card",
  type: "Visa",
  ...overrides,
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const jsonRequest = (url, body, method = "PATCH") =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

const createHandlers = (initialProducts, session = admin) => {
  let products = clone(initialProducts);
  const writes = [];
  const handlers = createAdminCatalogRouteHandlers({
    readCatalogProducts: async () => clone(products),
    writeCatalogProducts: async (nextProducts) => {
      products = clone(nextProducts);
      writes.push(clone(nextProducts));
    },
    requireAuth: () => session,
  });

  return { handlers, writes, getProducts: () => clone(products) };
};

test("admin catalog endpoints reject normal users server-side", async () => {
  const { handlers, writes } = createHandlers([product()], user);
  const response = await readJson(
    await handlers.updateProduct(jsonRequest("https://test.local/api/admin/card-catalog/products/admin-test-card", { active: false }), {
      params: Promise.resolve({ presetId: "admin-test-card" }),
    }),
  );

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, "FORBIDDEN");
  assert.equal(writes.length, 0);
});

test("admin can update product fee image active state and receives audit metadata", async () => {
  const { handlers, getProducts, writes } = createHandlers([product()]);
  const response = await readJson(
    await handlers.updateProduct(
      jsonRequest("https://test.local/api/admin/card-catalog/products/admin-test-card", {
        annualFee: 250000,
        imageUrl: "/card-images/placeholder-card.svg",
        active: false,
      }),
      { params: Promise.resolve({ presetId: "admin-test-card" }) },
    ),
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.annualFee, 250000);
  assert.equal(response.body.data.active, false);
  assert.equal(response.body.audit.updatedBy, admin.email);
  assert.equal(response.body.audit.storage, "data/card-presets.json");
  assert.equal(writes.length, 1);
  assert.equal(getProducts()[0].active, false);
});

test("admin can create products and update provider metadata in one provider section", async () => {
  const { handlers, getProducts } = createHandlers([product()]);
  const createResponse = await readJson(
    await handlers.createProduct(
      jsonRequest(
        "https://test.local/api/admin/card-catalog/products",
        product({
          presetId: "admin-test-card-two",
          displayName: "Admin Test Card Two",
          sortOrder: 9902,
          id: undefined,
          bank: undefined,
          bankName: undefined,
          name: undefined,
          type: undefined,
        }),
        "POST",
      ),
    ),
  );
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.data.id, "admin-test-card-two");

  const providerResponse = await readJson(
    await handlers.updateProvider(
      jsonRequest("https://test.local/api/admin/card-catalog/providers/adm", {
        providerName: "Admin Bank Updated",
        active: false,
      }),
      { params: Promise.resolve({ providerCode: "adm" }) },
    ),
  );

  assert.equal(providerResponse.status, 200);
  assert.equal(providerResponse.body.data.affectedProducts, 2);
  assert.equal(getProducts().every((item) => item.providerName === "Admin Bank Updated" && item.active === false), true);
});

test("inactive presets cannot create new cards while old snapshots still render", async () => {
  const inactiveCreate = await createCardFromPreset(
    { presetId: "vpbank-shopee-platinum", owner: "Long" },
    { CardModel: { create: async (payload) => payload } },
  ).catch((error) => error);
  assert.equal(inactiveCreate.code, "PRESET_INACTIVE");

  const oldSnapshot = serializeCreditCard({
    _id: "inactive-existing-card",
    presetId: "vpbank-shopee-platinum",
    providerCode: "VPBANK",
    providerName: "VPBank",
    displayName: "Shopee Platinum",
    network: "Mastercard",
    legacy: false,
    bank: "VPBANK",
    name: "Shopee Platinum",
    type: "Mastercard",
    owner: "Long",
    imageUrl: "/card-images/placeholder-card.svg",
    annualFee: 0,
    monthlyData: [],
  });

  assert.equal(oldSnapshot.presetId, "vpbank-shopee-platinum");
  assert.equal(oldSnapshot.displayName, "Shopee Platinum");
  assert.equal(oldSnapshot.legacy, false);
});

