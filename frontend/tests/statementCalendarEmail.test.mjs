import assert from "node:assert/strict";
import test from "node:test";
import { canEmailStatementCalendar, sendStatementCalendarEmailRequest } from "../lib/api/statementCalendarEmailCore.mjs";

test("calendar email action is eligible only for a persisted statement with both dates", () => {
  assert.equal(canEmailStatementCalendar({ _id: "s1", statementDate: "2026-07-31", paymentDueDate: "2026-08-15" }), true);
  assert.equal(canEmailStatementCalendar({ _id: "s1", statementDate: "2026-07-31" }), false);
  assert.equal(canEmailStatementCalendar({ statementDate: "2026-07-31", paymentDueDate: "2026-08-15" }), false);
});

test("calendar email client posts without recipient or request body", async () => {
  let call;
  const result = await sendStatementCalendarEmailRequest(async (url, init) => {
    call = { url, init };
    return { ok: true, json: async () => ({ data: { sent: true, recipient: "u***@example.test" } }) };
  }, "card/unsafe", "statement?unsafe");
  assert.deepEqual(call, {
    url: "/api/cards/card%2Funsafe/statements/statement%3Funsafe/calendar-email",
    init: { method: "POST" },
  });
  assert.equal(result.data.recipient, "u***@example.test");
});

test("calendar email client exposes only the safe API message", async () => {
  await assert.rejects(
    sendStatementCalendarEmailRequest(async () => ({ ok: false, json: async () => ({ error: { message: "Không thể gửi file lịch." } }) }), "c", "s"),
    /Không thể gửi file lịch/,
  );
});
