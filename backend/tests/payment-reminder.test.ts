import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../src/errors.js";
import { normalizeReminderPreferences, validTimezone } from "../src/reminder-preferences.js";
import { composePaymentReminder, reminderIsDue, retryAt } from "../src/payment-reminder.js";

test("normalizes unique sorted offsets and validates preferences", () => {
  assert.deepEqual(normalizeReminderPreferences({ reminderEnabled: true, reminderDaysBefore: [1, 7, 3, 7], reminderTimezone: "Asia/Ho_Chi_Minh", reminderTime: "08:00" }), { reminderEnabled: true, reminderDaysBefore: [7, 3, 1], reminderTimezone: "Asia/Ho_Chi_Minh", reminderTime: "08:00" });
  assert.equal(validTimezone("Asia/Ho_Chi_Minh"), true);
  for (const input of [{ reminderDaysBefore: [-1] }, { reminderDaysBefore: [61] }, { reminderTime: "8:00" }, { reminderTimezone: "Mars/Hanoi" }]) assert.throws(() => normalizeReminderPreferences(input), ApiError);
});

test("uses card local date and send time for due offset", () => {
  assert.equal(reminderIsDue(new Date("2026-07-12T01:00:00Z"), "2026-07-19", 7, "Asia/Ho_Chi_Minh", "08:00"), true);
  assert.equal(reminderIsDue(new Date("2026-07-12T00:59:00Z"), "2026-07-19", 7, "Asia/Ho_Chi_Minh", "08:00"), false);
  assert.equal(reminderIsDue(new Date("2026-07-12T01:00:00Z"), "2026-07-19", 3, "Asia/Ho_Chi_Minh", "08:00"), false);
});

test("retry backoff is bounded and reminder is Vietnamese without sensitive persistence", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(retryAt(now, 1).toISOString(), "2026-01-01T00:01:00.000Z");
  assert.equal(retryAt(now, 3).toISOString(), "2026-01-01T00:30:00.000Z");
  assert.match(composePaymentReminder({ to: "user@example.com", cardName: "Visa", statementDate: "2026-01-01", dueDate: "2026-01-08", amount: 100000, daysBefore: 7 }).text, /kiểm tra trạng thái hiện tại/);
});
