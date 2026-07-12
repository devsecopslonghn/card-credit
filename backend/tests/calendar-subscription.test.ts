import assert from "node:assert/strict";
import test from "node:test";
import { createSubscriptionToken, hashSubscriptionToken, normalizeDeviceLabel, serializePaymentDueFeed, validSubscriptionToken } from "../src/calendar-subscription.js";
import { buildApp } from "../src/app.js";
import { registerCalendarSubscriptionRoutes } from "../src/calendar-subscription-routes.js";
import type { AuthRepository } from "../src/auth-repository.js";

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
