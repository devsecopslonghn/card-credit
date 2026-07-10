import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAllowedUpdate,
  buildCardSnapshotFromProduct,
  createCardFromPreset,
  createCardFromRequestBody,
  createLegacyCard,
  updateCardById,
} from "../lib/services/cardService.mjs";

const createCapturingModel = () => {
  const calls = [];
  return {
    calls,
    async create(payload) {
      calls.push(payload);
      return { _id: "created-id", ...payload };
    },
  };
};

test("creates card from active preset with canonical snapshot and legacy aliases", async () => {
  const CardModel = createCapturingModel();
  const card = await createCardFromPreset(
    {
      presetId: "sacombank-visa-platinum-cashback",
      owner: "  Long   Ho  ",
      annualFee: 1,
      imageUrl: "client-override",
      providerName: "Client Provider",
    },
    { CardModel },
  );

  assert.equal(card.presetId, "sacombank-visa-platinum-cashback");
  assert.equal(card.providerCode, "STB");
  assert.equal(card.providerName, "Sacombank");
  assert.equal(card.displayName, "Visa Platinum Cashback");
  assert.equal(card.network, "Visa");
  assert.equal(card.bank, "STB");
  assert.equal(card.name, "Visa Platinum Cashback");
  assert.equal(card.type, "Visa");
  assert.equal(card.owner, "Long Ho");
  assert.notEqual(card.annualFee, 1);
  assert.notEqual(card.imageUrl, "client-override");
  assert.equal(card.legacy, false);
  assert.equal(card.monthlyData.length, 12);
});

test("card snapshots preserve existing values when catalog product metadata changes", () => {
  const originalProduct = {
    presetId: "bank-snapshot-card",
    providerCode: "BNK",
    providerName: "Bank",
    displayName: "Snapshot Card",
    network: "Visa",
    imageUrl: "/card-images/original.svg",
    annualFee: 100,
    targetSpendForWaiver: 1000,
  };
  const changedProduct = {
    ...originalProduct,
    providerName: "Bank Renamed",
    displayName: "Snapshot Card Renamed",
    network: "Mastercard",
    imageUrl: "/card-images/changed.svg",
    annualFee: 200,
    targetSpendForWaiver: 2000,
  };

  const existingCard = buildCardSnapshotFromProduct(originalProduct, "Long");
  const newCard = buildCardSnapshotFromProduct(changedProduct, "Long");

  assert.equal(existingCard.providerName, "Bank");
  assert.equal(existingCard.displayName, "Snapshot Card");
  assert.equal(existingCard.network, "Visa");
  assert.equal(existingCard.imageUrl, "/card-images/original.svg");
  assert.equal(existingCard.annualFee, 100);
  assert.equal(existingCard.targetSpendForWaiver, 1000);
  assert.equal(existingCard.monthlyData.length, 12);

  assert.equal(newCard.providerName, "Bank Renamed");
  assert.equal(newCard.displayName, "Snapshot Card Renamed");
  assert.equal(newCard.network, "Mastercard");
  assert.equal(newCard.imageUrl, "/card-images/changed.svg");
  assert.equal(newCard.annualFee, 200);
  assert.equal(newCard.targetSpendForWaiver, 2000);
});

test("create card from preset rejects missing preset", async () => {
  const CardModel = createCapturingModel();

  await assert.rejects(
    () => createCardFromPreset({ presetId: "missing-preset", owner: "Long" }, { CardModel }),
    (error) => error.status === 404 && error.code === "PRESET_NOT_FOUND",
  );
});

test("create card from preset rejects inactive preset", async () => {
  const CardModel = createCapturingModel();

  await assert.rejects(
    () => createCardFromPreset({ presetId: "vpbank-shopee-platinum", owner: "Long" }, { CardModel }),
    (error) => error.status === 409 && error.code === "PRESET_INACTIVE",
  );
});

test("POST catalog-first contract succeeds and ignores client metadata", async () => {
  const CardModel = createCapturingModel();
  const result = await createCardFromRequestBody(
    {
      presetId: "sacombank-jcb-ultimate",
      owner: "Long",
      annualFee: 0,
      displayName: "Override",
    },
    { CardModel },
  );

  assert.equal(result.deprecatedLegacy, false);
  assert.equal(result.card.displayName, "JCB Ultimate");
  assert.notEqual(result.card.annualFee, 0);
});

test("POST catalog-first contract rejects missing owner", async () => {
  const CardModel = createCapturingModel();

  await assert.rejects(
    () => createCardFromRequestBody({ presetId: "sacombank-jcb-ultimate" }, { CardModel }),
    (error) => error.status === 400 && error.code === "INVALID_OWNER",
  );
});

test("POST contract rejects missing preset when no legacy payload is present", async () => {
  const CardModel = createCapturingModel();

  await assert.rejects(
    () => createCardFromRequestBody({ owner: "Long" }, { CardModel }),
    (error) => error.status === 400 && error.code === "INVALID_REQUEST",
  );
});

test("legacy POST contract still works with explicit allowlist", async () => {
  const CardModel = createCapturingModel();
  const legacyCard = await createLegacyCard(
    {
      bank: "MANUAL",
      name: "Manual Card",
      type: "Visa",
      owner: " Long ",
      imageUrl: "data:image/svg+xml,<svg/>",
      annualFee: 1000,
      presetId: "client-should-not-set",
      providerName: "client-should-not-set",
    },
    { CardModel },
  );

  assert.equal(legacyCard.legacy, true);
  assert.equal(legacyCard.owner, "Long");
  assert.equal(legacyCard.presetId, undefined);
  assert.equal(legacyCard.providerName, undefined);
});

test("buildAllowedUpdate accepts operational fields", () => {
  const result = buildAllowedUpdate({
    owner: "  Long   Ho ",
    targetSpendForWaiver: 5000000,
    annualFeeWaiverTarget: 5000000,
    statementDay: 7,
    paymentDueDays: 15,
    cashbackCapAmount: 500000,
    cashbackCapPeriod: "STATEMENT",
    active: false,
  });

  assert.equal(result.update.owner, "Long Ho");
  assert.equal(result.update.annualFeeWaiverTarget, 5000000);
  assert.equal(result.update.statementDay, 7);
  assert.equal(result.update.paymentDueDays, 15);
  assert.equal(result.update.cashbackCapAmount, 500000);
  assert.equal(result.update.cashbackCapPeriod, "STATEMENT");
  assert.equal(result.update.active, false);
});

test("buildAllowedUpdate blocks annualFee-only update", () => {
  assert.throws(
    () => buildAllowedUpdate({ annualFee: 0 }),
    (error) => error.status === 400 && error.code === "FORBIDDEN_UPDATE_FIELD",
  );
});

test("buildAllowedUpdate blocks presetId-only update", () => {
  assert.throws(
    () => buildAllowedUpdate({ presetId: "sacombank-jcb-ultimate" }),
    (error) => error.status === 400 && error.code === "FORBIDDEN_UPDATE_FIELD",
  );
});

test("updateCardById rejects invalid ObjectId", async () => {
  const CardModel = {
    async findByIdAndUpdate() {
      throw new Error("should not be called");
    },
  };

  await assert.rejects(
    () => updateCardById("bad-id", { owner: "Long" }, { CardModel }),
    (error) => error.status === 400 && error.code === "INVALID_CARD_ID",
  );
});

test("updateCardById returns not found for missing card", async () => {
  const CardModel = {
    async findByIdAndUpdate() {
      return null;
    },
  };

  await assert.rejects(
    () => updateCardById("507f1f77bcf86cd799439011", { owner: "Long" }, { CardModel }),
    (error) => error.status === 404 && error.code === "CARD_NOT_FOUND",
  );
});

test("updateCardById updates card configuration fields", async () => {
  const CardModel = {
    async findByIdAndUpdate(id, update, options) {
      return { _id: id, ...update, options };
    },
  };

  const card = await updateCardById(
    "507f1f77bcf86cd799439011",
    { owner: "Long", statementDay: 10, paymentDueDays: 20, annualFeeWaiverTarget: 1000000, cashbackCapAmount: 500000 },
    { CardModel },
  );

  assert.equal(card.owner, "Long");
  assert.equal(card.statementDay, 10);
  assert.equal(card.paymentDueDays, 20);
  assert.equal(card.annualFeeWaiverTarget, 1000000);
  assert.equal(card.cashbackCapAmount, 500000);
  assert.equal(card.options.returnDocument, "after");
});
