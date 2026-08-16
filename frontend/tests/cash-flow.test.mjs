import assert from "node:assert/strict";
import test from "node:test";
import { parseMonthlyCashFlow } from "../lib/api/cashFlowCore.mjs";

test("cash-flow parser returns canonical rows with UI card aliases", () => {
  const parsed = parseMonthlyCashFlow({
    period: "2026-08",
    data: [{
      cardId: "card-1", period: "2026-08", totalOut: 100, totalIn: 25,
      statementPayments: 100, actualFees: 10, partnerReturns: 25,
      bankCashbackActual: 5, netResult: -75,
      card: { id: "card-1", providerName: "Bank", displayName: "Visa", owner: "Tôi" },
    }],
  });
  assert.equal(parsed.data[0].card?.bank, "Bank");
  assert.equal(parsed.data[0].card?.name, "Visa");
  assert.equal(parsed.data[0].netResult, -75);
});

test("cash-flow parser rejects malformed rows", () => {
  assert.throws(() => parseMonthlyCashFlow({ period: "2026-08", data: [{ cardId: "card-1" }] }));
  assert.throws(() => parseMonthlyCashFlow({ period: "0000-01", data: [] }));
});
