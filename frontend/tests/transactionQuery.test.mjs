import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const client = readFileSync(new URL("../lib/api/financeClient.ts", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8");

test("frontend transaction client builds requests from the shared query contract", () => {
  assert.match(client, /financialTransactionListQuerySchema\.parse\(input\)/);
  assert.match(client, /new URLSearchParams\(\)/);
  assert.match(client, /financialTransactionListQuerySchema/);
  assert.doesNotMatch(client, /query = ""/);
  assert.match(dashboard, /listFinancialTransactions\(\{ from, to \}\)/);
});
