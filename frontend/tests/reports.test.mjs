import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("finance client uses the canonical financial report endpoint", () => {
  const client = readFileSync(new URL("../lib/api/financeClient.ts", import.meta.url), "utf8");
  assert.match(client, /\/api\/financial-reports\/summary/);
  assert.match(client, /financialReportSchema\.parse/);
  assert.match(client, /reportDateRangeSchema\.parse/);
  assert.doesNotMatch(client, /credit-statements/);
  assert.doesNotMatch(client, /\/api\/reports\/summary/);
});

test("financial reports page renders separated financial KPIs and category breakdown", () => {
  const page = readFileSync(
    new URL("../app/reports/page.tsx", import.meta.url),
    "utf8",
  );
  const client = readFileSync(new URL("../lib/api/financeClient.ts", import.meta.url), "utf8");
  assert.match(page, /Personal spending/);
  assert.match(page, /Debit\/Cash\/E-wallet flow/);
  assert.match(page, /Credit debt/);
  assert.match(page, /Khoản phải thu/);
  assert.match(page, /Lợi ích và chi phí/);
  assert.match(page, /actualNetBenefit/);
  assert.match(page, /Chi tiêu theo danh mục/);
  assert.match(page, /Từ ngày/);
  assert.match(page, /Đến ngày/);
  assert.match(page, /setFrom/);
  assert.match(page, /setTo/);
  assert.match(page, /Lọc theo thẻ/);
  assert.match(page, /Lọc theo chủ thẻ/);
  assert.match(page, /Năm báo cáo/);
  assert.match(page, /Tháng báo cáo/);
  assert.match(client, /owner/);
  assert.match(client, /year/);
  assert.match(client, /month/);
  assert.match(client, /cardId/);
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
