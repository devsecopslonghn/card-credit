import assert from "node:assert/strict";
import { test } from "node:test";
import { serializeCreditCard } from "../lib/cards/serializerCore.mjs";

test("legacy document serializes provider, display and network fallbacks", () => {
  const original = {
    bank: "STB",
    name: "Visa Platinum Cashback",
    type: "Visa",
    monthlyData: [{ month: 1, spend: 100 }],
  };

  const serialized = serializeCreditCard(original);

  assert.equal(serialized.providerName, "STB");
  assert.equal(serialized.displayName, "Visa Platinum Cashback");
  assert.equal(serialized.network, "Visa");
  assert.equal(serialized.legacy, true);
  assert.deepEqual(serialized.monthlyData, original.monthlyData);
});

test("catalog document preserves canonical values", () => {
  const serialized = serializeCreditCard({
    presetId: "sacombank-jcb-ultimate",
    providerName: "Sacombank",
    displayName: "JCB Ultimate",
    network: "JCB",
    bank: "STB",
    name: "Legacy Name",
    type: "Visa",
    legacy: false,
  });

  assert.equal(serialized.providerName, "Sacombank");
  assert.equal(serialized.displayName, "JCB Ultimate");
  assert.equal(serialized.network, "JCB");
  assert.equal(serialized.legacy, false);
});

test("serializer does not mutate Mongoose-like documents", () => {
  const plain = {
    bank: "VCB",
    name: "Cashback",
    type: "Visa",
  };
  const document = {
    toObject() {
      return { ...plain };
    },
  };

  const serialized = serializeCreditCard(document);

  assert.equal("providerName" in document, false);
  assert.equal(serialized.providerName, "VCB");
});

test("serializer handles missing optional fields without losing payment or monthly data", () => {
  const serialized = serializeCreditCard({
    bank: "UNKNOWN",
    amountDueThisMonth: 123,
    paymentDueDate: "",
    isPaidThisMonth: false,
    annualFee: null,
    monthlyData: [{ month: 2, spend: 0, cashback: 0 }],
  });

  assert.equal(serialized.providerName, "UNKNOWN");
  assert.equal(serialized.displayName, undefined);
  assert.equal(serialized.network, undefined);
  assert.equal(serialized.legacy, true);
  assert.equal(serialized.annualFee, null);
  assert.equal(serialized.amountDueThisMonth, 123);
  assert.deepEqual(serialized.monthlyData, [{ month: 2, spend: 0, cashback: 0 }]);
});
