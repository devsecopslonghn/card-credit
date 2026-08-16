import assert from "node:assert/strict";
import test from "node:test";
import { createSubscriptionToken, hashSubscriptionToken, normalizeDeviceLabel, serializePaymentDueFeed, validSubscriptionToken } from "../src/calendar-subscription.js";
import { buildApp } from "../src/app.js";
import { registerCalendarSubscriptionRoutes } from "../src/calendar-subscription-routes.js";
import { CalendarSubscriptionService } from "../src/services/calendar-subscription-service.js";
import type { AuthRepository } from "../src/auth-repository.js";
import { CalendarSubscriptionModel } from "../src/models/calendar-subscription.js";
import { CreditCardModel } from "../src/models/credit-card.js";
import { CardStatementModel } from "../src/models/card-statement.js";
import { FinancialTransactionModel } from "../src/models/financial-transaction.js";
import { sessionCookie, signSession } from "../src/auth.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

const secret = "01234567890123456789012345678901";
const cookie = sessionCookie(signSession({ userId: "user-1", email: "user@example.test", role: "user", workspaceId: "workspace-a" }, secret));
const activeUser = { findUserById: async () => ({ id: "user-1", email: "user@example.test", passwordHash: "", displayName: "User", role: "user" as const, workspaceId: "workspace-a", active: true, lockedAt: null }) } as unknown as AuthRepository;

test("subscription write adapters use a revalidated browser context and preserve envelopes", async (t) => {
  const create = t.mock.method(CalendarSubscriptionService, "create", async (context: ServiceContext, deviceLabel: unknown) => {
    assert.equal(context.workspaceId, "workspace-a");
    assert.equal(context.userId, "user-1");
    assert.equal(context.channel, "browser");
    assert.equal(deviceLabel, "Laptop");
    return { id: "subscription-1", deviceLabel: "Laptop", createdAt: null, lastAccessedAt: null, revokedAt: null, subscriptionPath: "/api/calendar-subscriptions/feed/token.ics" };
  });
  const revoke = t.mock.method(CalendarSubscriptionService, "revoke", async (context: ServiceContext, id: string) => {
    assert.equal(context.workspaceId, "workspace-a");
    assert.equal(context.userId, "user-1");
    assert.equal(id, "507f1f77bcf86cd799439011");
    return { revoked: true };
  });
  const app = buildApp({ isReady: () => true }, "silent");
  registerCalendarSubscriptionRoutes(app, activeUser, secret);
  const created = await app.inject({ method: "POST", url: "/api/calendar-subscriptions", headers: { cookie }, payload: { deviceLabel: "Laptop" } });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().data.subscriptionPath, "/api/calendar-subscriptions/feed/token.ics");
  const deleted = await app.inject({ method: "DELETE", url: "/api/calendar-subscriptions/507f1f77bcf86cd799439011", headers: { cookie } });
  assert.equal(deleted.statusCode, 200);
  assert.deepEqual(deleted.json().data, { revoked: true });
  assert.equal(create.mock.callCount(), 1);
  assert.equal(revoke.mock.callCount(), 1);
  await app.close();
});

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

test("feed returns opaque 404 before card reads when the subscription owner moved workspaces", async (t) => {
  const token = createSubscriptionToken();
  t.mock.method(CalendarSubscriptionModel, "findOne", () => ({
    select: () => ({
      lean: async () => ({ _id: "507f1f77bcf86cd799439031", userId: "user-1", workspaceId: "workspace-a" }),
    }),
  }) as never);
  const cardFind = t.mock.method(CreditCardModel, "find", () => { throw new Error("card read must not happen"); });
  const app = buildApp({ isReady: () => true }, "silent");
  registerCalendarSubscriptionRoutes(app, {
    findUserById: async () => ({ id: "user-1", email: "user@example.test", displayName: "User", role: "user", workspaceId: "workspace-b", active: true, lockedAt: null }),
  } as unknown as AuthRepository, "01234567890123456789012345678901");
  const response = await app.inject({ method: "GET", url: `/api/calendar-subscriptions/feed/${token}.ics` });
  assert.equal(response.statusCode, 404);
  assert.equal(cardFind.mock.callCount(), 0);
  await app.close();
});

test("subscription feed batch-loads canonical statement amounts in one workspace scope", async (t) => {
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
    sort: () => ({ lean: async () => [{
      _id: cardId,
      workspaceId: "workspace-a",
      userId: "user-1",
      displayName: "Card A",
      providerName: "Bank A",
      owner: "Tôi",
      reminderTimezone: "Asia/Ho_Chi_Minh",
    }] }),
  }) as never);
  t.mock.method(CardStatementModel, "find", (query: Record<string, unknown>) => ({
    sort: () => ({
      lean: async () => [
        { _id: statementA, workspaceId: "workspace-a", userCardId: cardId, periodStartDate: "2026-06-12", periodEndDate: "2026-07-11", statementDate: "2026-07-11", paymentDueDate: "2026-07-26", statementDaySnapshot: 11, paymentDueDaysSnapshot: 15, paymentStatus: "OPEN" },
        { _id: statementB, workspaceId: "workspace-a", userCardId: cardId, periodStartDate: "2026-07-12", periodEndDate: "2026-08-11", statementDate: "2026-08-11", paymentDueDate: "2026-08-26", statementDaySnapshot: 11, paymentDueDaysSnapshot: 15, paymentStatus: "OPEN" },
        ...(query.paymentStatus ? [] : [{ _id: "507f1f77bcf86cd799439023", workspaceId: "workspace-a", userCardId: cardId, periodStartDate: "2026-05-12", periodEndDate: "2026-06-11", statementDate: "2026-06-11", paymentDueDate: "2026-06-26", statementDaySnapshot: 11, paymentDueDaysSnapshot: 15, paymentStatus: "PAID" }]),
      ],
    }),
  }) as never);
  const transactionFind = t.mock.method(FinancialTransactionModel, "find", () => ({
    sort: () => ({ lean: async () => [
      { _id: "507f1f77bcf86cd799439041", statementId: statementA, accountId: cardId, accountType: "CREDIT", transactionType: "EXPENSE", ownership: "PERSONAL", categoryId: "OTHER", amount: 600_000, creditDebt: 600_000, personalSpending: 600_000, debitCashflow: 0, outstandingReceivable: 0, reimbursementReceived: 0, transactionDate: "2026-07-01", note: "" },
      { _id: "507f1f77bcf86cd799439043", statementId: statementA, accountId: cardId, accountType: "DEBIT", transactionType: "STATEMENT_PAYMENT", ownership: "PERSONAL", categoryId: "OTHER", amount: 100_000, creditDebt: -100_000, personalSpending: 0, debitCashflow: -100_000, outstandingReceivable: 0, reimbursementReceived: 0, transactionDate: "2026-07-05", note: "" },
      { _id: "507f1f77bcf86cd799439042", statementId: statementB, accountId: cardId, accountType: "CREDIT", transactionType: "EXPENSE", ownership: "PERSONAL", categoryId: "OTHER", amount: 750_000, creditDebt: 750_000, personalSpending: 750_000, debitCashflow: 0, outstandingReceivable: 0, reimbursementReceived: 0, transactionDate: "2026-08-01", note: "" },
    ] }),
  }) as never);
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
  assert.equal(response.body.includes("900.000"), false);
  assert.equal(transactionFind.mock.callCount(), 1);
  assert.deepEqual(transactionFind.mock.calls[0]?.arguments[0], { statementId: { $in: [statementA, statementB] }, workspaceId: "workspace-a" });
  await app.close();
});
