import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");

test("middleware covers every session-backed application surface", () => {
  for (const path of ["/dashboard", "/transactions", "/accounts", "/budgets", "/reports", "/payments", "/notifications", "/fees", "/cashback", "/analytics"]) {
    assert.match(source, new RegExp(`"${path}"`));
    assert.match(source, new RegExp(`"${path}/:path\\*"`));
  }
  for (const path of ["/api/accounts", "/api/financial-transactions", "/api/financial-reports", "/api/finance", "/api/card-statements", "/api/notifications", "/api/fee-center", "/api/cash-flow"]) {
    assert.match(source, new RegExp(`"${path}"`));
    assert.match(source, new RegExp(`"${path}/:path\\*"`));
  }
});

test("calendar subscription feed remains token-authenticated outside session middleware", () => {
  assert.doesNotMatch(source, /"\/api\/calendar-subscriptions"/);
});
