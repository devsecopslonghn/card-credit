import assert from "node:assert/strict";
import test from "node:test";
import { parseCalendarSubscriptionCreate, parseCalendarSubscriptionList } from "../lib/api/calendarSubscriptionsCore.mjs";

const item = { id: "subscription-1", deviceLabel: "Laptop", createdAt: "2026-08-16T00:00:00.000Z", lastAccessedAt: null, revokedAt: null };

test("calendar subscription client parses canonical list/create DTOs and rejects unsafe shapes", () => {
  assert.deepEqual(parseCalendarSubscriptionList([item]), [item]);
  assert.equal(parseCalendarSubscriptionCreate({ ...item, subscriptionPath: `/api/calendar-subscriptions/feed/${"a".repeat(43)}.ics` }).id, "subscription-1");
  assert.throws(() => parseCalendarSubscriptionList([{ ...item, tokenHash: "secret" }]));
  assert.throws(() => parseCalendarSubscriptionList([{ ...item, createdAt: "2026-08-16" }]));
});
