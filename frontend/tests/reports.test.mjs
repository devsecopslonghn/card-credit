import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  fetchReportSummaryRequest,
  reportApiUrl,
  reportQuery,
} from "../lib/api/reportsCore.mjs";

test("report query applies compatible owner/card/year/month filters", () => {
  assert.equal(reportApiUrl({}), "/api/reports/summary");
  assert.equal(
    reportQuery({
      owner: "Tôi & bạn",
      cardId: "card/1",
      year: "2026",
      month: "07",
    }),
    "owner=T%C3%B4i+%26+b%E1%BA%A1n&cardId=card%2F1&year=2026&month=07",
  );
  assert.equal(reportQuery({ month: "07" }), "");
});

test("report client loads the same filtered JSON URL and exposes API errors", async () => {
  let call;
  const result = await fetchReportSummaryRequest(
    async (url, init) => {
      call = { url, init };
      return {
        ok: true,
        json: async () => ({ totals: { totalOutcome: 100 }, cards: [] }),
      };
    },
    { year: "2026", month: "07", owner: "Tôi" },
  );
  assert.deepEqual(call, {
    url: "/api/reports/summary?owner=T%C3%B4i&year=2026&month=07",
    init: { cache: "no-store" },
  });
  assert.equal(result.totals.totalOutcome, 100);
  await assert.rejects(
    fetchReportSummaryRequest(async () => ({
      ok: false,
      json: async () => ({ error: { message: "Báo cáo lỗi." } }),
    })),
    /Báo cáo lỗi/,
  );
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
  assert.match(page, /Chi tiêu theo danh mục/);
});

test("cards navigation and JSON export preserve the selected owner filter", () => {
  const page = readFileSync(
    new URL("../app/cards/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /ownerReportQuery = selectedOwner/);
  assert.match(page, /href=\{`\/reports\$\{ownerReportQuery\}`\}/);
  assert.match(page, /href=\{`\/reports\$\{ownerReportQuery \? /);
});
