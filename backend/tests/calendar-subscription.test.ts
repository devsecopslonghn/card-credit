import assert from "node:assert/strict";
import test from "node:test";
import { createSubscriptionToken, hashSubscriptionToken, normalizeDeviceLabel, serializePaymentDueFeed, validSubscriptionToken } from "../src/calendar-subscription.js";
import { buildApp } from "../src/app.js";
import { registerCalendarSubscriptionRoutes } from "../src/calendar-subscription-routes.js";
import type { AuthRepository } from "../src/auth-repository.js";
import { CalendarSubscriptionModel } from "../src/models/calendar-subscription.js";
import { CreditCardModel } from "../src/models/credit-card.js";
import { CardStatementModel } from "../src/models/card-statement.js";
import { CardTransactionModel } from "../src/models/card-transaction.js";

test("subscription token is random, URL-safe and stored through a one-way hash", () => {
  const first = createSubscriptionToken(); const second = createSubscriptionToken();
  assert.equal(validSubscriptionToken(first), true); assert.notEqual(first, second);
  assert.match(hashSubscriptionToken(first), /^[a-f0-9]{64}$/);
  assert.equal(hashSubscriptionToken(first).includes(first), false);
  assert.equal(validSubscriptionToken("short-or-malformed"), false);
});

test("device labels are optional, normalized and bounded", () => {
  assert.equal(normalizeDeviceLabel(undefined), null);
  assert.equal(normalizeDeviceLabel("  iPhone   cá nhân  "), "iPhone cá nhân");
  assert.throws(() => normalizeDeviceLabel("a".repeat(81)), /INVALID_DEVICE_LABEL/);
  assert.throws(() => normalizeDeviceLabel("iPhone\nInjected"), /INVALID_DEVICE_LABEL/);
});

test("subscription feed contains the three-day payment window and alarms only", () => {
  const calendar = serializePaymentDueFeed([{ identity: "workspace/user/statement", displayName: "Visa", providerName: "Ngân hàng", owner: "Tôi", periodStartDate: "2026-07-01", periodEndDate: "2026-07-31", statementDate: "2026-07-31", paymentDueDate: "2026-08-15", totalAmountDue: 500000, effectivePaymentStatus: "OPEN" }], new Date("2026-07-12T00:00:00Z"));
  assert.equal(calendar.match(/BEGIN:VEVENT/g)?.length, 1);
  assert.match(calendar, /DTSTART;TZID=Asia\/Ho_Chi_Minh:20260812T000000/);
  assert.match(calendar, /DTEND;TZID=Asia\/Ho_Chi_Minh:20260815T170000/);
  assert.equal(calendar.match(/BEGIN:VALARM/g)?.length, 3);
  assert.doesNotMatch(calendar, /DTSTART[^\r\n]*20260731/);
  assert.equal(calendar.includes("workspace/user/statement"), false);
});

test("management requires a session and malformed feed tokens return opaque 404", async () => {
  const app = buildApp({ isReady: () => true }, "silent");
  registerCalendarSubscriptionRoutes(app, { findUserById: async () => null } as unknown as AuthRepository, "01234567890123456789012345678901");
  assert.equal((await app.inject({ method: "GET", url: "/api/calendar-subscriptions" })).statusCode, 401);
  const response = await app.inject({ method: "GET", url: "/api/calendar-subscriptions/feed/not-a-token.ics" });
  assert.equal(response.statusCode, 404); assert.equal(response.body, "Not found");
  await app.close();
});

test("subscription feed aggregates all statement amounts in one workspace-scoped query", async (t) => {
  const token = createSubscriptionToken();
  const cardId = "507f1f77bcf86cd799439011";
  const statementA = "507f1f77bcf86cd799439021";
  const statementB = "507f1f77bcf86cd799439022";
  t.mock.method(CalendarSubscriptionModel, "findOne", () => ({
    select: () => ({
      lean: async () => ({
        _id: "507f1f77bcf86cd799439031",
        userId: "user-1",
        workspaceId: "workspace-a",
      }),
    }),
  }) as never);
  t.mock.method(CalendarSubscriptionModel, "updateOne", async () => ({
    modifiedCount: 1,
  }) as never);
  t.mock.method(CreditCardModel, "find", () => ({
    lean: async () => [{
      _id: cardId,
      workspaceId: "workspace-a",
      userId: "user-1",
      displayName: "Card A",
      providerName: "Bank A",
      owner: "Tôi",
      reminderTimezone: "Asia/Ho_Chi_Minh",
    }],
  }) as never);
  t.mock.method(CardStatementModel, "find", () => ({
    sort: () => ({
      lean: async () => [
        { _id: statementA, workspaceId: "workspace-a", userCardId: cardId, periodStartDate: "2026-06-12", periodEndDate: "2026-07-11", statementDate: "2026-07-11", paymentDueDate: "2026-07-26", paymentStatus: "OPEN" },
        { _id: statementB, workspaceId: "workspace-a", userCardId: cardId, periodStartDate: "2026-07-12", periodEndDate: "2026-08-11", statementDate: "2026-08-11", paymentDueDate: "2026-08-26", paymentStatus: "OPEN" },
      ],
    }),
  }) as never);
  const aggregate = t.mock.method(CardTransactionModel, "aggregate", async () => [
    { _id: statementA, amount: 500_000 },
    { _id: statementB, amount: 750_000 },
  ] as never);
  const users = {
    findUserById: async () => ({
      id: "user-1",
      email: "user@example.test",
      displayName: "User",
      role: "user",
      workspaceId: "workspace-a",
      active: true,
      lockedAt: null,
    }),
  } as unknown as AuthRepository;
  const app = buildApp({ isReady: () => true }, "silent");
  registerCalendarSubscriptionRoutes(
    app,
    users,
    "01234567890123456789012345678901",
  );

  const response = await app.inject({
    method: "GET",
    url: `/api/calendar-subscriptions/feed/${token}.ics`,
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.includes("500.000"), true);
  assert.equal(response.body.includes("750.000"), true);
  assert.equal(aggregate.mock.callCount(), 1);
  assert.deepEqual(aggregate.mock.calls[0]?.arguments[0], [
    {
      $match: {
        workspaceId: "workspace-a",
        statementId: { $in: [statementA, statementB] },
      },
    },
    { $group: { _id: "$statementId", amount: { $sum: "$outcomeAmount" } } },
  ]);
  await app.close();
});
