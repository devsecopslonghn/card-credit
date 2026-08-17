import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");

test("proxy covers every session-backed application surface", () => {
  assert.match(source, /export function proxy\(/);
  for (const path of ["/dashboard", "/transactions", "/accounts", "/budgets", "/reports", "/recurring", "/payments", "/notifications", "/fees", "/cashback", "/analytics"]) {
    assert.match(source, new RegExp(`"${path}"`));
    assert.match(source, new RegExp(`"${path}/:path\\*"`));
  }
  for (const path of ["/api/accounts", "/api/financial-transactions", "/api/financial-reports", "/api/finance", "/api/card-statements", "/api/notifications", "/api/fee-center", "/api/cash-flow"]) {
    assert.match(source, new RegExp(`"${path}"`));
    assert.match(source, new RegExp(`"${path}/:path\\*"`));
  }
});

test("calendar subscription feed remains token-authenticated outside session proxy", () => {
  assert.doesNotMatch(source, /"\/api\/calendar-subscriptions"/);
});
