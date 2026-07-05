import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildOperationalUpdatePayload,
  calculateCardMetrics,
  formatAnnualFee,
  formatDateDisplay,
} from "../lib/cards/uiCore.mjs";
import { buildReportSummary } from "../lib/reports/summaryCore.mjs";

test("detail update payload only includes operational fields", () => {
  const payload = buildOperationalUpdatePayload({
    owner: " Long  Ho ",
    targetSpendForWaiver: 10,
    statementDate: "2026-07-01",
    paymentDueDate: "2026-07-20",
    amountDueThisMonth: 100,
    isPaidThisMonth: true,
    presetId: "blocked",
    annualFee: 999,
    imageUrl: "blocked",
    providerName: "blocked",
    displayName: "blocked",
    network: "blocked",
    bank: "blocked",
    name: "blocked",
    type: "blocked",
  });

  assert.deepEqual(payload, {
    owner: "Long Ho",
    targetSpendForWaiver: 10,
    statementDate: "2026-07-01",
    paymentDueDate: "2026-07-20",
    amountDueThisMonth: 100,
    isPaidThisMonth: true,
  });
});

test("detail update payload preserves monthly data and excludes identity fields", () => {
  const monthlyData = [{ month: 1, spend: 1, cashback: 0, fee: 0, otherInterest: 0 }];
  const payload = buildOperationalUpdatePayload({ monthlyData, annualFee: 1000, imageUrl: "blocked" });

  assert.deepEqual(payload, { monthlyData });
  assert.equal("annualFee" in payload, false);
  assert.equal("imageUrl" in payload, false);
});

test("card calculations handle annual fee number zero null empty monthly data and negative net profit", () => {
  assert.equal(calculateCardMetrics({ annualFee: 100, monthlyData: [] }).annualFeeApplied, 100);
  assert.equal(calculateCardMetrics({ annualFee: 0, monthlyData: [] }).annualFeeApplied, 0);

  const unknownFee = calculateCardMetrics({ annualFee: null, monthlyData: [] });
  assert.equal(unknownFee.annualFeeKnown, false);
  assert.equal(unknownFee.annualFeeApplied, 0);
  assert.equal(Number.isNaN(unknownFee.netProfit), false);

  const negative = calculateCardMetrics({
    annualFee: 100,
    monthlyData: [{ month: 1, spend: 0, cashback: 0, fee: 25, otherInterest: 0 }],
  });
  assert.equal(negative.netProfit, -125);
});

test("date and annual fee formatting handle missing values", () => {
  assert.equal(formatDateDisplay(""), "Chưa thiết lập");
  assert.equal(formatAnnualFee(null), "Chưa xác định");
  assert.equal(formatAnnualFee(0), "0 ₫");
});

test("report summary handles mixed catalog and legacy cards", () => {
  const summary = buildReportSummary({
    filters: { owner: null, includeNotes: true },
    cards: [
      {
        _id: { toString: () => "catalog-id" },
        presetId: "sacombank-jcb-ultimate",
        providerCode: "STB",
        providerName: "Sacombank",
        displayName: "JCB Ultimate",
        network: "JCB",
        imageUrl: "/card.png",
        bank: "STB",
        name: "JCB Ultimate",
        type: "JCB",
        legacy: false,
        owner: "Long",
        annualFee: 100,
        amountDueThisMonth: 10,
        monthlyData: [{ month: 1, spend: 100, cashback: 10, fee: 2, otherInterest: 1 }],
      },
      {
        _id: { toString: () => "legacy-id" },
        bank: "VCB",
        name: "Legacy Visa",
        type: "Visa",
        annualFee: null,
        monthlyData: [{ month: 1, spend: 50, cashback: 0, fee: 0, otherInterest: 0 }],
      },
    ],
    notes: [{ _id: { toString: () => "note-id" }, date: "2026-07-05", content: "note" }],
  });

  assert.equal(summary.cards.length, 2);
  assert.equal(summary.cards[0].providerName, "Sacombank");
  assert.equal(summary.cards[0].displayName, "JCB Ultimate");
  assert.equal(summary.cards[0].network, "JCB");
  assert.equal(summary.cards[0].bank, "STB");
  assert.equal(summary.cards[0].imageUrl, "/card.png");
  assert.equal(summary.cards[1].providerName, "VCB");
  assert.equal(summary.cards[1].displayName, "Legacy Visa");
  assert.equal(summary.cards[1].network, "Visa");
  assert.equal(summary.cards[1].legacy, true);
  assert.equal(summary.cards[1].annualFee, null);
  assert.equal(summary.cards[1].totals.annualFeeApplied, 0);
  assert.equal(Number.isNaN(summary.totals.netProfit), false);
  assert.equal(summary.notes[0].id, "note-id");
});

test("report summary empty dataset is valid", () => {
  const summary = buildReportSummary({ cards: [], notes: [], filters: { owner: null } });

  assert.deepEqual(summary.cards, []);
  assert.equal(summary.totals.spend, 0);
  assert.equal(summary.totals.netProfit, 0);
});
