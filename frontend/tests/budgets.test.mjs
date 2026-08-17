import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("budget client and page consume the canonical backend status DTO", () => {
  const client = readFileSync(new URL("../lib/api/financeClient.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/budgets/page.tsx", import.meta.url), "utf8");
  assert.match(client, /budgetStatusListSchema\.parse/);
  assert.match(client, /Promise<BudgetStatusDto\[\]>/);
  assert.match(page, /usedAmount/);
  assert.match(page, /remainingAmount/);
  assert.match(page, /usagePercent/);
  assert.match(page, /item\.status/);
  assert.match(client, /upsertBudget/);
  assert.match(page, /Lưu ngân sách/);
  assert.match(page, /Category ID/);
  assert.match(page, /Hạn mức/);
  assert.doesNotMatch(page, /type Budget =/);
  assert.doesNotMatch(page, /item\.(?:spent|limit|remaining)(?!Amount)/);
});
