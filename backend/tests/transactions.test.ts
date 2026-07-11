import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { sessionCookie, signSession } from "../src/auth.js";
import { registerReportRoutes } from "../src/report-routes.js";
import { derived, statementPeriod, summarize, transactionInput, validDate } from "../src/statement-domain.js";
import { registerTransactionRoutes } from "../src/transaction-routes.js";

const secret = "01234567890123456789012345678901";
const cookie = sessionCookie(signSession({ userId: "user-1", email: "user@example.test", role: "user", workspaceId: "workspace-a" }, secret));

test("statement boundaries clamp short months and transaction totals preserve VND integers", () => {
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(validDate("2027-02-29"), false);
  assert.deepEqual(statementPeriod("2026-02-01", 31, 15), { periodStartDate: "2026-02-01", periodEndDate: "2026-02-28", statementDate: "2026-02-28", paymentDueDate: "2026-03-15", statementDaySnapshot: 31, paymentDueDaysSnapshot: 15 });
  const input = transactionInput({ transactionDate: "2026-07-11", outcomeAmount: 100_000, incomeInputMode: "RATE", partnerReturnRateBps: 200, cashbackRateBps: 100 });
  assert.equal(input.incomeAmount, 2_000);
  assert.equal(derived({ ...input, cashbackStatus: "PENDING" }).expectedNetProfit, -97_000);
  const summary = summarize([
    { ...input, cashbackStatus: "RECEIVED", actualCashbackAmount: 1_000 },
  ]);
  assert.equal(summary.totalAmountDue, 100_000);
  assert.deepEqual(summary.cashbackCap, {
    capAmount: null,
    unlimited: true,
    cashbackByRate: 1_000,
    eligibleCashback: 1_000,
    actualCashback: 1_000,
    exceededCashback: 0,
    remainingCashback: null,
    capUsedPercent: null,
  });
  assert.equal(summarize([{ ...input }], 5_000).cashbackCap.capUsedPercent, 20);
});

test("transaction, statement and report routes enforce sessions before database access", async () => {
  const app = buildApp({ isReady: () => true }, "silent");
  registerTransactionRoutes(app, secret); registerReportRoutes(app, secret);
  for (const url of ["/api/card-transactions", "/api/cards/507f1f77bcf86cd799439011/statements", "/api/reports/summary"]) assert.equal((await app.inject({ url })).statusCode, 401);
  const invalid = await app.inject({ method: "PATCH", url: "/api/card-transactions/not-an-id", headers: { cookie }, payload: {} });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().error.code, "INVALID_ID");
  await app.close();
});
