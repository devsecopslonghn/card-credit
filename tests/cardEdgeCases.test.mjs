import assert from "node:assert/strict";
import { test } from "node:test";
import { createCardsRouteHandlers } from "../lib/api/cardsRouteCore.mjs";
import { CARD_IMAGE_PLACEHOLDER_URL, createCatalogService } from "../lib/cardCatalogCore.mjs";
import { serializeCreditCard } from "../lib/cards/serializerCore.mjs";
import {
  calculateCardMetrics,
  formatAnnualFee,
  formatDateDisplay,
  formatVnd,
  getDisplayName,
  groupCardsByProvider,
  normalizeOwnerInput,
} from "../lib/cards/uiCore.mjs";
import { buildReportSummary } from "../lib/reports/summaryCore.mjs";
import { createCardFromPreset } from "../lib/services/cardService.mjs";

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

const product = (overrides) => ({
  presetId: "edge-product",
  providerCode: "EDGE",
  providerName: "Edge Bank",
  displayName: "Edge Product",
  network: "Visa",
  annualFee: 1000,
  imageUrl: "/card-images/placeholder-card.svg",
  sourceUrl: "https://example.test/edge-product",
  sourceCheckedAt: "2026-01-01",
  active: true,
  sortOrder: 10,
  ...overrides,
});

test("CC-034 catalog edge cases have explicit expected behavior", () => {
  const longName = "Very Long Product Name ".repeat(12).trim();
  const service = createCatalogService([
    product({ presetId: "edge-zero-fee", displayName: "Zero Fee", annualFee: 0, sortOrder: 1 }),
    product({ presetId: "edge-null-fee", displayName: "Null Fee", annualFee: null, imageUrl: "", sortOrder: 2 }),
    product({
      presetId: "edge-same-provider-visa-a",
      displayName: "Same Provider Visa A",
      network: "Visa",
      sortOrder: 3,
    }),
    product({
      presetId: "edge-same-provider-visa-b",
      displayName: "Same Provider Visa B",
      network: "Visa",
      sortOrder: 4,
    }),
    product({ presetId: "edge-inactive", displayName: "Inactive", active: false, sortOrder: 5 }),
    product({
      presetId: "empty-provider-product",
      providerCode: "EMPTY",
      providerName: "Empty Provider",
      displayName: "Only Inactive Product",
      active: false,
      sortOrder: 6,
    }),
    product({ presetId: "edge-long-name", displayName: longName, sortOrder: 7 }),
  ]);

  const activeIds = service.getActiveCatalogProducts().map((item) => item.presetId);
  assert.equal(formatAnnualFee(service.getPresetById("edge-zero-fee").annualFee), "0 ₫");
  assert.equal(formatAnnualFee(service.getPresetById("edge-null-fee").annualFee), "Chưa xác định");
  assert.equal(service.getPresetById("edge-null-fee").imageUrl, CARD_IMAGE_PLACEHOLDER_URL);
  assert.equal(activeIds.includes("edge-inactive"), false);
  assert.deepEqual(service.getProductsByProvider("EMPTY"), []);
  assert.equal(service.getPresetById("edge-long-name").displayName, longName);

  const edgeGroup = service.getCatalogProviders().find((provider) => provider.providerCode === "EDGE");
  assert.deepEqual(
    edgeGroup.products
      .filter((item) => item.network === "Visa" && item.presetId.startsWith("edge-same-provider"))
      .map((item) => item.displayName),
    ["Same Provider Visa A", "Same Provider Visa B"],
  );
});

test("CC-034 UI helper edge cases use readable fallbacks and finite values", () => {
  const cards = [
    {
      _id: "missing-preset",
      bank: "Legacy Bank",
      name: "Legacy Card",
      type: "Visa",
      owner: " Long   Ho ",
      imageUrl: "data:image/svg+xml,<svg/>",
      annualFee: null,
      statementDate: "",
      paymentDueDate: "",
      amountDueThisMonth: undefined,
      monthlyData: [{ month: 1, spend: undefined, cashback: undefined, fee: undefined, otherInterest: undefined }],
    },
  ];
  const serialized = serializeCreditCard(cards[0]);
  const report = buildReportSummary({ cards, notes: [] });
  const metrics = calculateCardMetrics(cards[0]);

  assert.equal(serialized.legacy, true);
  assert.equal(serialized.providerName, "Legacy Bank");
  assert.equal(serialized.displayName, "Legacy Card");
  assert.equal(serialized.network, "Visa");
  assert.equal(serialized.imageUrl, "data:image/svg+xml,<svg/>");
  assert.equal(formatDateDisplay(serialized.statementDate), "Chưa thiết lập");
  assert.equal(formatDateDisplay(serialized.paymentDueDate), "Chưa thiết lập");
  assert.equal(formatVnd(serialized.amountDueThisMonth), "0 ₫");
  assert.equal(formatAnnualFee(serialized.annualFee), "Chưa xác định");
  assert.equal(Number.isNaN(metrics.netProfit), false);
  assert.equal(Number.isNaN(report.totals.netProfit), false);
  assert.equal(JSON.stringify(report).includes("undefinedđ"), false);
  assert.equal(normalizeOwnerInput(serialized.owner), "Long Ho");
  assert.equal(getDisplayName(serialized), "Legacy Card");
});

test("CC-034 cards with same provider and network but different products remain distinct", () => {
  const groups = groupCardsByProvider([
    {
      _id: "a",
      providerCode: "EDGE",
      providerName: "Edge Bank",
      displayName: "Visa Product A",
      network: "Visa",
    },
    {
      _id: "b",
      providerCode: "EDGE",
      providerName: "Edge Bank",
      displayName: "Visa Product B",
      network: "Visa",
    },
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].cards.map((card) => card.displayName),
    ["Visa Product A", "Visa Product B"],
  );
});

test("CC-034 inactive preset and database failures return structured behavior", async () => {
  await assert.rejects(
    () =>
      createCardFromPreset(
        { presetId: "vpbank-shopee-platinum", owner: " Long  Ho " },
        { CardModel: { async create() {} } },
      ),
    (error) => error.status === 409 && error.code === "PRESET_INACTIVE",
  );

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    const handlers = createCardsRouteHandlers({
      connectToDatabase: async () => {
        throw new Error("database unavailable");
      },
      CardModel: {},
    });
    const response = await readJson(await handlers.GET());

    assert.equal(response.status, 500);
    assert.equal(response.body.error.code, "INTERNAL_ERROR");
    assert.equal(typeof response.body.error.message, "string");
    assert.equal("stack" in response.body.error, false);
  } finally {
    console.error = originalConsoleError;
  }
});
