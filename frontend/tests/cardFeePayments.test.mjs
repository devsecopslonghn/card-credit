import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCardFeePaymentPayload,
  cardFeePaymentFormFromRecord,
  currentDate,
  deleteCardFeePaymentRequest,
  emptyCardFeePaymentForm,
  fetchCardFeePaymentsRequest,
  saveCardFeePaymentRequest,
  sortCardFeePayments,
} from "../lib/api/cardFeePaymentsCore.mjs";

test("paid-fee form defaults to today and validates positive integer VND", () => {
  assert.equal(currentDate(new Date(2026, 6, 23, 12)), "2026-07-23");
  assert.deepEqual(emptyCardFeePaymentForm("2026-07-23"), {
    id: "",
    paymentDate: "2026-07-23",
    amount: "",
    note: "",
  });
  assert.deepEqual(
    buildCardFeePaymentPayload({
      id: "",
      paymentDate: "2026-07-23",
      amount: "299000",
      note: "  Phí quý 3  ",
    }),
    { paymentDate: "2026-07-23", amount: 299000, note: "Phí quý 3" },
  );
  assert.throws(
    () =>
      buildCardFeePaymentPayload({
        id: "",
        paymentDate: "2026-07-23",
        amount: "0",
        note: "",
      }),
    /lớn hơn 0/,
  );
});

test("editing populates the form and history sorts newest first", () => {
  assert.deepEqual(
    cardFeePaymentFormFromRecord({
      _id: "fee-1",
      paymentDate: "2026-07-22",
      amount: 100000,
      note: "Phí năm",
    }),
    {
      id: "fee-1",
      paymentDate: "2026-07-22",
      amount: "100000",
      note: "Phí năm",
    },
  );
  assert.deepEqual(
    sortCardFeePayments([
      { paymentDate: "2026-01-01" },
      { paymentDate: "2026-07-01" },
    ]).map((item) => item.paymentDate),
    ["2026-07-01", "2026-01-01"],
  );
});

test("client lists, creates, updates, and deletes encoded resources", async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    if (init?.method === "DELETE") return { ok: true, json: async () => ({}) };
    if (init?.method === "POST" || init?.method === "PUT")
      return { ok: true, json: async () => ({ data: { _id: "fee-1" } }) };
    return {
      ok: true,
      json: async () => ({ data: [{ id: "fee-1", cardId: "card-1", category: "ANNUAL_CARD_FEE", paymentDate: "2026-07-01", amount: 100000, note: "" }] }),
    };
  };
  await fetchCardFeePaymentsRequest(fetcher, "card/unsafe");
  await saveCardFeePaymentRequest(fetcher, "card/unsafe", {
    id: "",
    paymentDate: "2026-07-23",
    amount: "1",
    note: "",
  });
  await saveCardFeePaymentRequest(fetcher, "card/unsafe", {
    id: "fee/unsafe",
    paymentDate: "2026-07-24",
    amount: "2",
    note: "",
  });
  await deleteCardFeePaymentRequest(fetcher, "card/unsafe", "fee/unsafe");
  assert.equal(calls[0].url, "/api/cards/card%2Funsafe/fee-payments");
  assert.equal(calls[1].init.method, "POST");
  assert.equal(calls[2].url, "/api/cards/card%2Funsafe/fee-payments/fee%2Funsafe");
  assert.equal(calls[2].init.method, "PUT");
  assert.equal(calls[3].init.method, "DELETE");
});

test("client errors remain covered and card detail links to the centralized Fee Center", async () => {
  await assert.rejects(
    fetchCardFeePaymentsRequest(
      async () => ({
        ok: false,
        json: async () => ({ error: { message: "Không có quyền." } }),
      }),
      "card",
    ),
    /Không có quyền/,
  );
  const component = readFileSync(
    new URL("../components/cards/CardFeePaymentSection.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /href="\/fees"/);
  assert.match(component, /nhập tập trung tại Fee Center/);
});
