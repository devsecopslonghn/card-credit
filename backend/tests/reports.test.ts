import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { sessionCookie, signSession } from "../src/auth.js";
import { CreditCardModel } from "../src/models/credit-card.js";
import { CardStatementModel } from "../src/models/card-statement.js";
import { CardTransactionModel } from "../src/models/card-transaction.js";
import { MonthlyCardCashbackModel } from "../src/models/monthly-card-cashback.js";
import { registerReportRoutes } from "../src/report-routes.js";

const secret = "01234567890123456789012345678901";
const cookie = sessionCookie(
  signSession(
    {
      userId: "user-1",
      email: "user@example.test",
      role: "user",
      workspaceId: "workspace-a",
    },
    secret,
  ),
);
const cardA = "507f1f77bcf86cd799439011";
const cardB = "507f1f77bcf86cd799439012";
const cardC = "507f1f77bcf86cd799439013";

const sortedLean = (items: unknown[]) =>
  ({
    sort: () => ({ lean: async () => items }),
  }) as never;

test("report filters transaction dates and cashback periods without double counting", async (t) => {
  const cardFind = t.mock.method(CreditCardModel, "find", () =>
    sortedLean([
      {
        _id: cardA,
        workspaceId: "workspace-a",
        owner: "Tôi",
        bank: "BANK_A",
        name: "Card A",
        type: "Visa",
        createdAt: new Date("2025-01-02T00:00:00.000Z"),
        cashbackCapAmount: null,
      },
      {
        _id: cardB,
        workspaceId: "workspace-a",
        owner: "Tôi",
        bank: "BANK_B",
        name: "Card B",
        type: "Mastercard",
        cashbackCapAmount: null,
      },
      {
        _id: cardC,
        workspaceId: "workspace-a",
        owner: "Tôi",
        bank: "BANK_C",
        name: "Card C",
        type: "JCB",
        cashbackCapAmount: null,
      },
    ]),
  );
  const transactionFind = t.mock.method(CardTransactionModel, "find", () =>
    sortedLean([
      {
        userCardId: cardA,
        transactionDate: "2026-07-05",
        outcomeAmount: 1000,
        incomeAmount: 200,
        cashbackRateBps: 1000,
        cashbackStatus: "RECEIVED",
        actualCashbackAmount: 90,
        eligibleForAnnualFeeWaiver: true,
      },
      {
        userCardId: cardB,
        transactionDate: "2026-07-12",
        outcomeAmount: 100,
        incomeAmount: 0,
        cashbackRateBps: 0,
        cashbackStatus: "PENDING",
        actualCashbackAmount: null,
        eligibleForAnnualFeeWaiver: true,
      },
      {
        userCardId: cardA,
        transactionDate: "2026-07-10",
        outcomeAmount: 500,
        incomeAmount: 100,
        cashbackRateBps: 1000,
        cashbackStatus: "PENDING",
        actualCashbackAmount: null,
        eligibleForAnnualFeeWaiver: true,
      },
    ]),
  );
  t.mock.method(CardStatementModel, "find", () => sortedLean([]));
  const cashbackFind = t.mock.method(
    MonthlyCardCashbackModel,
    "find",
    () =>
      sortedLean([
        {
          userCardId: cardA,
          period: "2026-07",
          status: "PENDING",
          expectedAmount: 120,
          actualAmount: null,
        },
        {
          userCardId: cardB,
          period: "2026-07",
          status: "RECEIVED",
          expectedAmount: 20,
          actualAmount: 20,
        },
        {
          userCardId: cardA,
          period: "2026-07",
          status: "RECEIVED",
          expectedAmount: 80,
          actualAmount: 75,
        },
        {
          userCardId: cardA,
          period: "2026-07",
          status: "REJECTED",
          expectedAmount: 40,
          actualAmount: null,
        },
      ]),
  );
  const app = buildApp({ isReady: () => true }, "silent");
  registerReportRoutes(app, secret);
  const response = await app.inject({
    url: `/api/reports/summary?year=2026&month=07&owner=${encodeURIComponent("Tôi")}`,
    headers: { cookie },
  });
  const body = response.json();

  assert.equal(response.statusCode, 200);
  assert.deepEqual(body.filters, {
    owner: "Tôi",
    cardId: null,
    year: "2026",
    month: "07",
  });
  assert.equal(body.cards.length, 3);
  assert.equal(body.cards[2].totals.totalOutcome, 0);
  assert.equal(body.cards[0].createdAt, "2025-01-02T00:00:00.000Z");
  assert.equal(body.totals.totalOutcome, 1600);
  assert.equal(body.totals.totalIncome, 300);
  assert.equal(body.totals.totalServiceFee, 1300);
  assert.equal(body.totals.expectedCashback, 150);
  assert.equal(body.totals.monthlyBankCashbackExpected, 220);
  assert.equal(body.totals.monthlyBankCashbackActual, 95);
  assert.equal(body.totals.monthlyBankCashbackRejected, 40);
  assert.equal(body.totals.actualNetBenefit, -1205);
  assert.equal(
    body.totals.monthlyBankCashbackActual + body.totals.actualCashback,
    185,
  );
  assert.deepEqual(cardFind.mock.calls[0]?.arguments[0], {
    workspaceId: "workspace-a",
    owner: "Tôi",
  });
  assert.deepEqual(transactionFind.mock.calls[0]?.arguments[0], {
    workspaceId: "workspace-a",
    userCardId: { $in: [cardA, cardB, cardC] },
    transactionDate: { $gte: "2026-07-01", $lt: "2026-08-01" },
  });
  assert.deepEqual(cashbackFind.mock.calls[0]?.arguments[0], {
    workspaceId: "workspace-a",
    userCardId: { $in: [cardA, cardB, cardC] },
    period: "2026-07",
  });
  const annualResponse = await app.inject({
    url: "/api/reports/summary?year=2026",
    headers: { cookie },
  });
  assert.equal(annualResponse.statusCode, 200);
  assert.deepEqual(transactionFind.mock.calls[1]?.arguments[0], {
    workspaceId: "workspace-a",
    userCardId: { $in: [cardA, cardB, cardC] },
    transactionDate: { $gte: "2026-01-01", $lt: "2027-01-01" },
  });
  assert.deepEqual(cashbackFind.mock.calls[1]?.arguments[0], {
    workspaceId: "workspace-a",
    userCardId: { $in: [cardA, cardB, cardC] },
    period: { $gte: "2026-01", $lte: "2026-12" },
  });
  await app.close();
});

test("all-time and card filters retain legacy response fields and workspace scope", async (t) => {
  const cardFind = t.mock.method(CreditCardModel, "find", () =>
    sortedLean([
      {
        _id: cardA,
        workspaceId: "workspace-a",
        bank: "BANK_A",
        name: "Card A",
        type: "Visa",
        owner: "Tôi",
        cashbackCapAmount: null,
      },
    ]),
  );
  const transactionFind = t.mock.method(
    CardTransactionModel,
    "find",
    () => sortedLean([]),
  );
  t.mock.method(CardStatementModel, "find", () => sortedLean([]));
  const cashbackFind = t.mock.method(
    MonthlyCardCashbackModel,
    "find",
    () => sortedLean([]),
  );
  const app = buildApp({ isReady: () => true }, "silent");
  registerReportRoutes(app, secret);
  const response = await app.inject({
    url: `/api/reports/summary?cardId=${cardA}`,
    headers: { cookie },
  });
  const body = response.json();

  assert.equal(response.statusCode, 200);
  assert.equal(body.cards[0].id, cardA);
  assert.equal(body.cards[0]._id, cardA);
  assert.equal(body.cards[0].bank, "BANK_A");
  assert.equal(body.cards[0].name, "Card A");
  assert.equal(body.cards[0].type, "Visa");
  assert.equal(body.cards[0].totals.totalAmountDue, 0);
  assert.deepEqual(cardFind.mock.calls[0]?.arguments[0], {
    workspaceId: "workspace-a",
    _id: cardA,
  });
  assert.deepEqual(transactionFind.mock.calls[0]?.arguments[0], {
    workspaceId: "workspace-a",
    userCardId: { $in: [cardA] },
  });
  assert.deepEqual(cashbackFind.mock.calls[0]?.arguments[0], {
    workspaceId: "workspace-a",
    userCardId: { $in: [cardA] },
  });
  await app.close();
});

test("report rejects invalid ranges and card ids before database access", async (t) => {
  const cardFind = t.mock.method(CreditCardModel, "find");
  const app = buildApp({ isReady: () => true }, "silent");
  registerReportRoutes(app, secret);
  for (const url of [
    "/api/reports/summary?year=26",
    "/api/reports/summary?month=07",
    "/api/reports/summary?year=2026&month=13",
    "/api/reports/summary?cardId=not-an-id",
  ]) {
    const response = await app.inject({ url, headers: { cookie } });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "INVALID_REPORT_FILTER");
  }
  assert.equal(cardFind.mock.callCount(), 0);
  await app.close();
});
