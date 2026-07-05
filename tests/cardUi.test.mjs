import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCreateCardPayload,
  filterCardsByOwner,
  formatAnnualFee,
  getDisplayName,
  getNetwork,
  getProviderName,
  groupCardsByProvider,
  normalizeOwnerInput,
  validateOwnerInput,
} from "../lib/cards/uiCore.mjs";

test("groups cards by provider with catalog and legacy fallback", () => {
  const groups = groupCardsByProvider([
    {
      _id: "2",
      providerCode: "STB",
      providerName: "Sacombank",
      displayName: "JCB Ultimate",
      network: "JCB",
    },
    {
      _id: "1",
      bank: "VCB",
      name: "Legacy Visa",
      type: "Visa",
    },
    {
      _id: "3",
      providerCode: "STB",
      providerName: "Sacombank",
      displayName: "Visa Platinum Cashback",
      network: "Visa",
    },
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].providerName, "Sacombank");
  assert.equal(groups[0].cards.length, 2);
  assert.equal(groups[1].providerName, "VCB");
});

test("legacy display fallbacks are stable", () => {
  const card = { bank: "STB", name: "Legacy Card", type: "Visa" };

  assert.equal(getProviderName(card), "STB");
  assert.equal(getDisplayName(card), "Legacy Card");
  assert.equal(getNetwork(card), "Visa");
});

test("annual fee formatter handles number zero null and undefined", () => {
  assert.equal(formatAnnualFee(100000), "100.000 ₫");
  assert.equal(formatAnnualFee(0), "0 ₫");
  assert.equal(formatAnnualFee(null), "Chưa xác định");
  assert.equal(formatAnnualFee(undefined), "Chưa xác định");
});

test("owner validation trims collapses whitespace and rejects invalid values", () => {
  assert.equal(normalizeOwnerInput(" Long   Ho "), "Long Ho");
  assert.deepEqual(validateOwnerInput("   ").valid, false);
  assert.deepEqual(validateOwnerInput("Long Ho").valid, true);
  assert.deepEqual(validateOwnerInput("x".repeat(121)).valid, false);
});

test("owner filter uses normalized owner values", () => {
  const cards = [{ _id: "1", owner: " Long   Ho " }, { _id: "2", owner: "Tôi" }];
  const filtered = filterCardsByOwner(cards, "Long Ho");

  assert.deepEqual(filtered.map((card) => card._id), ["1"]);
});

test("provider and card sort are stable", () => {
  const groups = groupCardsByProvider([
    { _id: "2", bank: "B", name: "Zulu", type: "Visa" },
    { _id: "1", bank: "A", name: "Alpha", type: "Visa" },
    { _id: "3", bank: "A", name: "Beta", type: "Visa" },
  ]);

  assert.deepEqual(groups.map((group) => group.providerName), ["A", "B"]);
  assert.deepEqual(groups[0].cards.map((card) => card.name), ["Alpha", "Beta"]);
});

test("create card payload only contains presetId and owner", () => {
  const payload = buildCreateCardPayload("sacombank-visa-platinum-cashback", " Long  Ho ");

  assert.deepEqual(payload, {
    presetId: "sacombank-visa-platinum-cashback",
    owner: "Long Ho",
  });
  assert.equal("annualFee" in payload, false);
  assert.equal("imageUrl" in payload, false);
  assert.equal("network" in payload, false);
});
