import test from "node:test";
import assert from "node:assert/strict";
import { createPreviewToken, consumePreviewToken } from "../src/mcp/preview.js";

test("preview token binds operation and payload", () => {
  const payload = { statementId: "statement-1", action: "PAID" };
  const token = createPreviewToken("change_payment_status", payload);
  assert.doesNotThrow(() => consumePreviewToken(token, "change_payment_status", payload));
  assert.throws(() => consumePreviewToken(token, "change_payment_status", { ...payload, action: "REOPEN" }));
  assert.throws(() => consumePreviewToken(token, "create_transaction", payload));
});
