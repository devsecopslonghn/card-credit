import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../src/errors.js";
import { normalizeReminderPreferences, validTimezone } from "../src/reminder-preferences.js";
import { composePaymentReminder, reminderDueDate, reminderIsDue, retryAt } from "../src/payment-reminder.js";
import { ReminderScheduler } from "../src/reminder-scheduler.js";
import { CreditCardModel } from "../src/models/credit-card.js";
import { CardStatementModel } from "../src/models/card-statement.js";
import { CardTransactionModel } from "../src/models/card-transaction.js";
import { ReminderDeliveryModel } from "../src/models/reminder-delivery.js";
import { WorkspaceModel } from "../src/models/workspace.js";
import type { AuthRepository, AuthUser } from "../src/auth-repository.js";
import type { ReminderEmail } from "../src/payment-reminder.js";

test("normalizes unique sorted offsets and validates preferences", () => {
  assert.deepEqual(normalizeReminderPreferences({ reminderEnabled: true, reminderDaysBefore: [1, 7, 3, 7], reminderTimezone: "Asia/Ho_Chi_Minh", reminderTime: "08:00" }), { reminderEnabled: true, reminderDaysBefore: [7, 3, 1], reminderTimezone: "Asia/Ho_Chi_Minh", reminderTime: "08:00" });
  assert.equal(validTimezone("Asia/Ho_Chi_Minh"), true);
  for (const input of [{ reminderDaysBefore: [-1] }, { reminderDaysBefore: [61] }, { reminderTime: "8:00" }, { reminderTimezone: "Mars/Hanoi" }]) assert.throws(() => normalizeReminderPreferences(input), ApiError);
});

test("uses card local date and send time for due offset", () => {
  assert.equal(reminderDueDate(new Date("2026-07-12T01:00:00Z"), 7, "Asia/Ho_Chi_Minh"), "2026-07-19");
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

test("scheduler scans exact due dates and batch-loads statements, totals, and users", async (t) => {
  const userId = "507f1f77bcf86cd799439041";
  const cardA = "507f1f77bcf86cd799439011";
  const cardB = "507f1f77bcf86cd799439012";
  const statementA = "507f1f77bcf86cd799439021";
  const statementB = "507f1f77bcf86cd799439022";
  t.mock.method(CreditCardModel, "find", async () => [
    { toObject: () => ({ _id: cardA, workspaceId: "workspace-a", userId, displayName: "Card A", reminderDaysBefore: [7, 3], reminderTimezone: "Asia/Ho_Chi_Minh", reminderTime: "08:00" }) },
    { toObject: () => ({ _id: cardB, workspaceId: "workspace-a", userId: null, displayName: "Card B", reminderDaysBefore: [7], reminderTimezone: "Asia/Ho_Chi_Minh", reminderTime: "08:00" }) },
  ] as never);
  const statementFind = t.mock.method(CardStatementModel, "find", async () => [
    { toObject: () => ({ _id: statementA, workspaceId: "workspace-a", userCardId: cardA, statementDate: "2026-07-05", paymentDueDate: "2026-07-19", paymentStatus: "OPEN" }) },
    { toObject: () => ({ _id: statementB, workspaceId: "workspace-a", userCardId: cardB, statementDate: "2026-07-05", paymentDueDate: "2026-07-19", paymentStatus: "OPEN" }) },
  ] as never);
  const workspaceFind = t.mock.method(WorkspaceModel, "find", async () => [{
    get: (field: string) => field === "workspaceId" ? "workspace-a" : userId,
  }] as never);
  const aggregate = t.mock.method(CardTransactionModel, "aggregate", async () => [
    { _id: statementA, amount: 100_000 },
    { _id: statementB, amount: 200_000 },
  ] as never);
  const claim = t.mock.method(ReminderDeliveryModel, "findOneAndUpdate", async () => ({
    _id: `delivery-${claim.mock.callCount()}`,
    get: (field: string) => field === "attemptCount" ? 1 : undefined,
  }) as never);
  const deliveryUpdate = t.mock.method(ReminderDeliveryModel, "updateOne", async () => ({ modifiedCount: 1 }) as never);
  const user: AuthUser = { id: userId, email: "user@example.test", passwordHash: "hash", role: "user", workspaceId: "workspace-a", displayName: "User", active: true, lockedAt: null };
  let userReads = 0;
  const users = { findUserById: async () => { userReads += 1; return user; } } as unknown as AuthRepository;
  const messages: ReminderEmail[] = [];
  const scheduler = new ReminderScheduler(
    users,
    { sendStatementCalendarEmail: async () => {}, sendPaymentReminder: async (message) => { messages.push(message); } },
    60_000,
    300_000,
    { error: () => {}, info: () => {} },
    () => new Date("2026-07-12T01:00:00Z"),
  );

  await scheduler.scan();

  assert.equal(statementFind.mock.callCount(), 1);
  assert.deepEqual(statementFind.mock.calls[0]?.arguments[0], {
    workspaceId: { $in: ["workspace-a"] },
    userCardId: { $in: [cardA, cardB] },
    paymentStatus: { $ne: "PAID" },
    paymentDueDate: { $in: ["2026-07-19", "2026-07-15"] },
  });
  assert.equal(workspaceFind.mock.callCount(), 1);
  assert.deepEqual(workspaceFind.mock.calls[0]?.arguments[0], {
    workspaceId: { $in: ["workspace-a"] },
  });
  assert.equal(aggregate.mock.callCount(), 1);
  assert.equal(userReads, 1);
  assert.equal(claim.mock.callCount(), 2);
  assert.equal(deliveryUpdate.mock.callCount(), 2);
  assert.deepEqual(messages.map((message) => message.text.includes("200.000")), [false, true]);
});
