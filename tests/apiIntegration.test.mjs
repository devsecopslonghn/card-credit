import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getCatalogProductDetailRoute,
  getCatalogProductsRoute,
  getCatalogProvidersRoute,
} from "../lib/api/cardCatalogRouteCore.mjs";
import { createCardDetailRouteHandlers, createCardsRouteHandlers } from "../lib/api/cardsRouteCore.mjs";
import { createReportSummaryRouteHandler } from "../lib/api/reportSummaryRouteCore.mjs";

const ids = {
  catalog: "507f1f77bcf86cd799439011",
  legacy: "507f1f77bcf86cd799439012",
  missing: "507f1f77bcf86cd799439099",
};

const jsonRequest = (url, body, method = "POST") =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
  headers: response.headers,
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const sortBySpec = (items, sortSpec = {}) => {
  const entries = Object.entries(sortSpec);
  if (entries.length === 0) return [...items];

  return [...items].sort((left, right) => {
    for (const [field, direction] of entries) {
      const leftValue = left[field] ?? "";
      const rightValue = right[field] ?? "";
      const comparison = String(leftValue).localeCompare(String(rightValue), "vi");
      if (comparison !== 0) return direction < 0 ? -comparison : comparison;
    }
    return 0;
  });
};

const createQuery = (items) => ({
  sort(sortSpec) {
    const sorted = sortBySpec(items, sortSpec);
    return {
      lean: async () => clone(sorted),
      then: (resolve, reject) => Promise.resolve(clone(sorted)).then(resolve, reject),
    };
  },
});

const createFakeCardModel = (initialCards = []) => {
  const state = {
    cards: initialCards.map(clone),
    createCalls: [],
    deletedIds: [],
  };

  const model = {
    state,
    async create(payload) {
      const card = {
        _id: `507f1f77bcf86cd7994390${state.cards.length + 20}`,
        createdAt: new Date(0).toISOString(),
        ...clone(payload),
      };
      state.createCalls.push(clone(payload));
      state.cards.push(card);
      return clone(card);
    },
    find(query = {}) {
      const filtered = state.cards.filter((card) =>
        Object.entries(query).every(([field, value]) => card[field] === value),
      );
      return createQuery(filtered);
    },
    async findById(id) {
      const card = state.cards.find((item) => item._id === id);
      return card ? clone(card) : null;
    },
    async findByIdAndUpdate(id, update) {
      const index = state.cards.findIndex((item) => item._id === id);
      if (index === -1) return null;
      state.cards[index] = { ...state.cards[index], ...clone(update) };
      return clone(state.cards[index]);
    },
    async findByIdAndDelete(id) {
      const index = state.cards.findIndex((item) => item._id === id);
      if (index === -1) return null;
      const [deleted] = state.cards.splice(index, 1);
      state.deletedIds.push(id);
      return clone(deleted);
    },
  };

  return model;
};

const createFakeNoteModel = (notes = []) => ({
  find() {
    return createQuery(notes.map(clone));
  },
});

const createHandlers = (initialCards = [], notes = []) => {
  const CardModel = createFakeCardModel(initialCards);
  const CalendarNoteModel = createFakeNoteModel(notes);
  const connectCalls = [];
  const connectToDatabase = async () => {
    connectCalls.push(true);
  };

  return {
    CardModel,
    cards: createCardsRouteHandlers({ connectToDatabase, CardModel }),
    detail: createCardDetailRouteHandlers({ connectToDatabase, CardModel }),
    report: createReportSummaryRouteHandler({ connectToDatabase, CardModel, CalendarNoteModel }),
    connectCalls,
  };
};

const catalogCard = {
  _id: ids.catalog,
  presetId: "sacombank-jcb-ultimate",
  providerCode: "STB",
  providerName: "Sacombank",
  displayName: "JCB Ultimate",
  network: "JCB",
  catalogVersion: "json-v1",
  legacy: false,
  bank: "STB",
  name: "JCB Ultimate",
  type: "JCB",
  owner: "Long",
  imageUrl: "/card-images/generated/sacombank-jcb-ultimate.png",
  annualFee: 1699000,
  amountDueThisMonth: 100000,
  isPaidThisMonth: false,
  monthlyData: [{ month: 1, spend: 1000000, cashback: 50000, fee: 0, otherInterest: 0 }],
};

const legacyCard = {
  _id: ids.legacy,
  bank: "VCB",
  name: "Legacy Visa",
  type: "Visa",
  owner: "Long",
  imageUrl: "/legacy.png",
  annualFee: null,
  amountDueThisMonth: 0,
  isPaidThisMonth: true,
  monthlyData: [{ month: 1, spend: 100000, cashback: 0, fee: 0, otherInterest: 0 }],
};

test("Catalog API routes return providers, products, provider filters and product detail", async () => {
  const providers = await readJson(await getCatalogProvidersRoute());
  assert.equal(providers.status, 200);
  assert.equal(providers.body.data.some((provider) => provider.providerCode === "STB"), true);
  assert.equal(
    providers.body.data.some((provider) => provider.products.some((product) => product.active === false)),
    false,
  );

  const allProducts = await readJson(await getCatalogProductsRoute(new Request("https://test.local/api/card-catalog/products")));
  assert.equal(allProducts.status, 200);
  assert.equal(allProducts.body.data.some((product) => product.presetId === "vpbank-shopee-platinum"), false);

  const filteredProducts = await readJson(
    await getCatalogProductsRoute(new Request("https://test.local/api/card-catalog/products?provider=stb")),
  );
  assert.equal(filteredProducts.status, 200);
  assert.equal(filteredProducts.body.data.length > 0, true);
  assert.equal(filteredProducts.body.data.every((product) => product.providerCode === "STB"), true);

  const detail = await readJson(
    await getCatalogProductDetailRoute(new Request("https://test.local/api/card-catalog/products/sacombank-jcb-ultimate"), {
      params: Promise.resolve({ presetId: "sacombank-jcb-ultimate" }),
    }),
  );
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.presetId, "sacombank-jcb-ultimate");
  assert.equal(detail.body.data.providerName, "Sacombank");
  assert.equal("bank" in detail.body.data, false);
});

test("Catalog API routes return structured errors for missing provider and preset", async () => {
  const missingProvider = await readJson(
    await getCatalogProductsRoute(new Request("https://test.local/api/card-catalog/products?provider=missing")),
  );
  assert.equal(missingProvider.status, 404);
  assert.equal(missingProvider.body.error.code, "PROVIDER_NOT_FOUND");
  assert.equal(missingProvider.body.error.fields.provider, "MISSING");

  const missingPreset = await readJson(
    await getCatalogProductDetailRoute(new Request("https://test.local/api/card-catalog/products/missing-preset"), {
      params: Promise.resolve({ presetId: "missing-preset" }),
    }),
  );
  assert.equal(missingPreset.status, 404);
  assert.equal(missingPreset.body.error.code, "PRESET_NOT_FOUND");

  const inactivePreset = await readJson(
    await getCatalogProductDetailRoute(new Request("https://test.local/api/card-catalog/products/vpbank-shopee-platinum"), {
      params: Promise.resolve({ presetId: "vpbank-shopee-platinum" }),
    }),
  );
  assert.equal(inactivePreset.status, 404);
  assert.equal(inactivePreset.body.error.code, "PRESET_NOT_FOUND");
});

test("Cards API POST creates catalog card and ignores client product metadata overrides", async () => {
  const { CardModel, cards, connectCalls } = createHandlers();
  const response = await readJson(
    await cards.POST(
      jsonRequest("https://test.local/api/cards", {
        presetId: "sacombank-jcb-ultimate",
        owner: "  Long   Ho  ",
        annualFee: 1,
        imageUrl: "client-override",
        network: "Client Network",
      }),
    ),
  );

  assert.equal(response.status, 201);
  assert.equal(connectCalls.length, 1);
  assert.equal(response.body.presetId, "sacombank-jcb-ultimate");
  assert.equal(response.body.owner, "Long Ho");
  assert.equal(response.body.providerName, "Sacombank");
  assert.equal(response.body.displayName, "JCB Ultimate");
  assert.equal(response.body.network, "JCB");
  assert.equal(response.body.annualFee, 1699000);
  assert.notEqual(response.body.imageUrl, "client-override");
  assert.equal(CardModel.state.createCalls[0].annualFee, 1699000);
});

test("Cards API POST validates owner, missing preset and inactive preset with structured errors", async () => {
  const { cards } = createHandlers();

  const invalidOwner = await readJson(
    await cards.POST(jsonRequest("https://test.local/api/cards", { presetId: "sacombank-jcb-ultimate", owner: "   " })),
  );
  assert.equal(invalidOwner.status, 400);
  assert.equal(invalidOwner.body.error.code, "INVALID_OWNER");
  assert.equal(invalidOwner.body.error.fields.owner, "Tên chủ thẻ không được để trống.");

  const missingPreset = await readJson(
    await cards.POST(jsonRequest("https://test.local/api/cards", { presetId: "missing-preset", owner: "Long" })),
  );
  assert.equal(missingPreset.status, 404);
  assert.equal(missingPreset.body.error.code, "PRESET_NOT_FOUND");

  const inactivePreset = await readJson(
    await cards.POST(jsonRequest("https://test.local/api/cards", { presetId: "vpbank-shopee-platinum", owner: "Long" })),
  );
  assert.equal(inactivePreset.status, 409);
  assert.equal(inactivePreset.body.error.code, "PRESET_INACTIVE");
});

test("Cards API keeps legacy POST compatibility and serializes mixed catalog and legacy cards", async () => {
  const { cards } = createHandlers([catalogCard, legacyCard]);
  const createResponse = await readJson(
    await cards.POST(
      jsonRequest("https://test.local/api/cards", {
        bank: "MANUAL",
        name: "Manual Card",
        type: "Visa",
        owner: " Long ",
        imageUrl: "/manual.png",
        annualFee: 1000,
        providerName: "client-should-not-set",
      }),
    ),
  );

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.headers.get("X-Deprecated-Contract"), "legacy-card-create");
  assert.equal(createResponse.body.legacy, true);
  assert.equal(createResponse.body.providerName, "MANUAL");
  assert.equal(createResponse.body.displayName, "Manual Card");
  assert.equal(createResponse.body.network, "Visa");
  assert.equal(createResponse.body.presetId, undefined);

  const listResponse = await readJson(await cards.GET());
  assert.equal(listResponse.status, 200);
  const byId = new Map(listResponse.body.map((card) => [card._id, card]));
  assert.equal(byId.get(ids.catalog).providerName, "Sacombank");
  assert.equal(byId.get(ids.catalog).legacy, false);
  assert.equal(byId.get(ids.legacy).providerName, "VCB");
  assert.equal(byId.get(ids.legacy).displayName, "Legacy Visa");
  assert.equal(byId.get(ids.legacy).network, "Visa");
  assert.equal(byId.get(ids.legacy).legacy, true);
});

test("Card detail route gets valid cards and returns structured invalid id and not found errors", async () => {
  const { detail } = createHandlers([catalogCard]);

  const valid = await readJson(
    await detail.GET(new Request(`https://test.local/api/cards/${ids.catalog}`), {
      params: Promise.resolve({ id: ids.catalog }),
    }),
  );
  assert.equal(valid.status, 200);
  assert.equal(valid.body._id, ids.catalog);
  assert.equal(valid.body.providerName, "Sacombank");

  const invalidId = await readJson(
    await detail.GET(new Request("https://test.local/api/cards/not-an-id"), {
      params: Promise.resolve({ id: "not-an-id" }),
    }),
  );
  assert.equal(invalidId.status, 400);
  assert.equal(invalidId.body.error.code, "INVALID_CARD_ID");

  const notFound = await readJson(
    await detail.GET(new Request(`https://test.local/api/cards/${ids.missing}`), {
      params: Promise.resolve({ id: ids.missing }),
    }),
  );
  assert.equal(notFound.status, 404);
  assert.equal(notFound.body.error.code, "CARD_NOT_FOUND");
});

test("Card detail route updates operational fields, blocks product identity updates and deletes cards", async () => {
  const { CardModel, detail } = createHandlers([catalogCard]);

  const update = await readJson(
    await detail.PUT(
      jsonRequest(`https://test.local/api/cards/${ids.catalog}`, { owner: " Updated  Owner ", amountDueThisMonth: 250000 }, "PUT"),
      { params: Promise.resolve({ id: ids.catalog }) },
    ),
  );
  assert.equal(update.status, 200);
  assert.equal(update.body.owner, "Updated Owner");
  assert.equal(update.body.amountDueThisMonth, 250000);
  assert.equal(update.body.providerName, "Sacombank");

  const blocked = await readJson(
    await detail.PUT(jsonRequest(`https://test.local/api/cards/${ids.catalog}`, { presetId: "other", annualFee: 0 }, "PUT"), {
      params: Promise.resolve({ id: ids.catalog }),
    }),
  );
  assert.equal(blocked.status, 400);
  assert.equal(blocked.body.error.code, "FORBIDDEN_UPDATE_FIELD");
  assert.equal(blocked.body.error.fields.fields, "presetId, annualFee");

  const deleted = await readJson(
    await detail.DELETE(new Request(`https://test.local/api/cards/${ids.catalog}`, { method: "DELETE" }), {
      params: Promise.resolve({ id: ids.catalog }),
    }),
  );
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.message, "Đã xóa thẻ thành công");
  assert.deepEqual(CardModel.state.deletedIds, [ids.catalog]);
});

test("Reports route summarizes mixed catalog and legacy cards with canonical and compatibility fields", async () => {
  const { report } = createHandlers([catalogCard, legacyCard], [
    { _id: "note-id", date: "2026-07-05", content: "Pay card" },
  ]);
  const response = await readJson(await report(new Request("https://test.local/api/reports/summary")));

  assert.equal(response.status, 200);
  assert.equal(response.body.cards.length, 2);
  assert.equal(response.body.cards[0].id, ids.catalog);
  assert.equal(response.body.cards[0].presetId, "sacombank-jcb-ultimate");
  assert.equal(response.body.cards[0].providerCode, "STB");
  assert.equal(response.body.cards[0].providerName, "Sacombank");
  assert.equal(response.body.cards[0].displayName, "JCB Ultimate");
  assert.equal(response.body.cards[0].network, "JCB");
  assert.equal(response.body.cards[0].bank, "STB");
  assert.equal(response.body.cards[0].name, "JCB Ultimate");
  assert.equal(response.body.cards[0].type, "JCB");
  assert.equal(response.body.cards[1].providerName, "VCB");
  assert.equal(response.body.cards[1].displayName, "Legacy Visa");
  assert.equal(response.body.cards[1].network, "Visa");
  assert.equal(response.body.cards[1].annualFee, null);
  assert.equal(response.body.cards[1].totals.annualFeeApplied, 0);
  assert.equal(Number.isNaN(response.body.totals.netProfit), false);
  assert.equal(response.body.notes[0].id, "note-id");
});

test("Reports route handles empty dataset", async () => {
  const { report } = createHandlers();
  const response = await readJson(await report(new Request("https://test.local/api/reports/summary?includeNotes=false")));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.cards, []);
  assert.deepEqual(response.body.notes, []);
  assert.equal(response.body.filters.includeNotes, false);
  assert.equal(response.body.totals.spend, 0);
  assert.equal(response.body.totals.netProfit, 0);
});

test("Reports route returns structured error for database failures", async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const report = createReportSummaryRouteHandler({
      connectToDatabase: async () => {},
      CardModel: {
        find() {
          throw new Error("database unavailable");
        },
      },
      CalendarNoteModel: createFakeNoteModel(),
    });

    const response = await readJson(await report(new Request("https://test.local/api/reports/summary")));
    assert.equal(response.status, 500);
    assert.equal(response.body.error.code, "INTERNAL_ERROR");
    assert.equal(typeof response.body.error.message, "string");
  } finally {
    console.error = originalConsoleError;
  }
});
