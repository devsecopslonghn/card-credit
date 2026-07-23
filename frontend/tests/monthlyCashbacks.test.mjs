import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildMonthlyCashbackPayload,
  currentPeriod,
  deleteMonthlyCashbackRequest,
  emptyMonthlyCashbackForm,
  fetchMonthlyCashbacksRequest,
  monthlyCashbackFormFromRecord,
  sortMonthlyCashbacks,
  upsertMonthlyCashbackRequest,
} from "../lib/api/monthlyCashbacksCore.mjs";

test("form defaults to current month, pending, and enables actual amount only through status", () => {
  assert.equal(currentPeriod(new Date(2026, 6, 23)), "2026-07");
  assert.deepEqual(emptyMonthlyCashbackForm("2026-07"), {
    period: "2026-07",
    expectedAmount: "",
    actualAmount: "",
    status: "PENDING",
    note: "",
  });
  const component = readFileSync(
    new URL("../components/cards/MonthlyCashbackSection.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /disabled=\{form\.status !== "RECEIVED"\}/);
  assert.match(component, /required=\{form\.status === "RECEIVED"\}/);
});

test("payload keeps actual amount only for received and validates integer VND", () => {
  assert.deepEqual(
    buildMonthlyCashbackPayload({
      period: "2026-07",
      expectedAmount: "120000",
      actualAmount: "999999",
      status: "PENDING",
      note: "  chờ nhận  ",
    }),
    {
      period: "2026-07",
      payload: {
        expectedAmount: 120000,
        actualAmount: null,
        status: "PENDING",
        note: "chờ nhận",
      },
    },
  );
  assert.equal(
    buildMonthlyCashbackPayload({
      period: "2026-07",
      expectedAmount: "120000",
      actualAmount: "110000",
      status: "RECEIVED",
      note: "",
    }).payload.actualAmount,
    110000,
  );
  assert.throws(
    () =>
      buildMonthlyCashbackPayload({
        period: "2026-07",
        expectedAmount: "-1",
        actualAmount: "",
        status: "PENDING",
        note: "",
      }),
    /số nguyên VND không âm/,
  );
  assert.throws(
    () =>
      buildMonthlyCashbackPayload({
        period: "2026-07",
        expectedAmount: "100",
        actualAmount: "",
        status: "RECEIVED",
        note: "",
      }),
    /Cashback thực nhận là bắt buộc/,
  );
});

test("record editing populates form and history sorts newest first", () => {
  const record = {
    _id: "cb-1",
    period: "2026-07",
    expectedAmount: 120000,
    actualAmount: 110000,
    status: "RECEIVED",
    note: "Đã nhận",
  };
  assert.deepEqual(monthlyCashbackFormFromRecord(record), {
    period: "2026-07",
    expectedAmount: "120000",
    actualAmount: "110000",
    status: "RECEIVED",
    note: "Đã nhận",
  });
  assert.deepEqual(
    sortMonthlyCashbacks([
      { period: "2026-01" },
      { period: "2026-12" },
      { period: "2026-07" },
    ]).map((item) => item.period),
    ["2026-12", "2026-07", "2026-01"],
  );
});

test("client lists, upserts, and deletes encoded card/month resources", async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    if (init?.method === "DELETE")
      return { ok: true, json: async () => ({ message: "ok" }) };
    if (init?.method === "PUT")
      return {
        ok: true,
        json: async () => ({
          data: { _id: "cb-1", period: "2026-07", status: "PENDING" },
        }),
      };
    return {
      ok: true,
      json: async () => ({
        data: [{ period: "2026-01" }, { period: "2026-07" }],
      }),
    };
  };

  const listed = await fetchMonthlyCashbacksRequest(
    fetcher,
    "card/unsafe",
    "2026",
  );
  assert.deepEqual(
    listed.map((item) => item.period),
    ["2026-07", "2026-01"],
  );
  await upsertMonthlyCashbackRequest(fetcher, "card/unsafe", {
    period: "2026-07",
    expectedAmount: "100",
    actualAmount: "",
    status: "PENDING",
    note: "",
  });
  await deleteMonthlyCashbackRequest(fetcher, "card/unsafe", "2026-07");

  assert.equal(
    calls[0].url,
    "/api/cards/card%2Funsafe/monthly-cashbacks?year=2026",
  );
  assert.equal(
    calls[1].url,
    "/api/cards/card%2Funsafe/monthly-cashbacks/2026-07",
  );
  assert.deepEqual(calls[1].init, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedAmount: 100,
      actualAmount: null,
      status: "PENDING",
      note: "",
    }),
  });
  assert.equal(calls[2].init.method, "DELETE");
});

test("client exposes API errors and UI refreshes after mutations with delete confirmation", async () => {
  await assert.rejects(
    fetchMonthlyCashbacksRequest(
      async () => ({
        ok: false,
        json: async () => ({ error: { message: "Không có quyền." } }),
      }),
      "card",
      "2026",
    ),
    /Không có quyền/,
  );
  const component = readFileSync(
    new URL("../components/cards/MonthlyCashbackSection.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /await upsertMonthlyCashback\(cardId, form\)/);
  assert.match(component, /await deleteMonthlyCashback\(cardId, record\.period\)/);
  assert.match(component, /window\.confirm/);
  assert.equal((component.match(/await loadRecords\(\)/g) ?? []).length >= 2, true);
  assert.match(component, /hidden overflow-x-auto[\s\S]*md:block/);
  assert.match(component, /space-y-3 md:hidden/);
});
