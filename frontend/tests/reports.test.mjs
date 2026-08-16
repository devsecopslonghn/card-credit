import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("finance client uses the canonical financial report endpoint", () => {
  const client = readFileSync(new URL("../lib/api/financeClient.ts", import.meta.url), "utf8");
  assert.match(client, /\/api\/financial-reports\/summary\?from=/);
  assert.match(client, /financialReportSchema\.parse/);
  assert.match(client, /reportDateRangeSchema\.parse/);
  assert.match(client, /creditStatementReportListSchema\.parse/);
  assert.doesNotMatch(client, /\/api\/reports\/summary/);
});

test("financial reports page renders separated financial KPIs and category breakdown", () => {
  const page = readFileSync(
    new URL("../app/reports/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /Personal spending/);
  assert.match(page, /Debit\/Cash\/E-wallet flow/);
  assert.match(page, /Credit debt/);
  assert.match(page, /Khoản phải thu/);
  assert.match(page, /Lợi ích và chi phí/);
  assert.match(page, /actualNetBenefit/);
  assert.match(page, /Chi tiêu theo danh mục/);
});

test("cards navigation and JSON export point to canonical report surfaces", () => {
  const page = readFileSync(
    new URL("../app/cards/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /href="\/reports"/);
  assert.match(page, /\/api\/financial-reports\/summary\?from=/);
  assert.doesNotMatch(page, /ownerReportQuery/);
  assert.doesNotMatch(page, /\/api\/reports\/summary/);
});
