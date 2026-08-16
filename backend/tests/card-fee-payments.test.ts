import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { sessionCookie, signSession } from "../src/auth.js";
import { CreditCardModel } from "../src/models/credit-card.js";
import { CardFeePaymentModel } from "../src/models/card-fee-payment.js";
import { registerCardFeePaymentRoutes } from "../src/card-fee-payment-routes.js";
import { FeeQueryService } from "../src/services/fee-query-service.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

const secret = "01234567890123456789012345678901";
const cardId = "507f1f77bcf86cd799439011";
const feePaymentId = "507f1f77bcf86cd799439012";
const cookie = sessionCookie(
  signSession(
    {
      userId: "user-1",
      email: "user@example.test",
      role: "user",
      workspaceId: "workspace-a",
    },
    secret,
  ),
);

const appWithRoutes = () => {
  const app = buildApp({ isReady: () => true }, "silent");
  registerCardFeePaymentRoutes(app, secret);
  return app;
};

test("paid card fee routes require a session before database access", async (t) => {
  const cardFind = t.mock.method(CreditCardModel, "findOne");
  const app = appWithRoutes();
  for (const request of [
    { method: "GET", url: `/api/cards/${cardId}/fee-payments` },
    {
      method: "POST",
      url: `/api/cards/${cardId}/fee-payments`,
      payload: { paymentDate: "2026-07-23", amount: 100000 },
    },
    {
      method: "PUT",
      url: `/api/cards/${cardId}/fee-payments/${feePaymentId}`,
      payload: { paymentDate: "2026-07-23", amount: 100000 },
    },
    {
      method: "DELETE",
      url: `/api/cards/${cardId}/fee-payments/${feePaymentId}`,
    },
  ] as const)
    assert.equal((await app.inject(request)).statusCode, 401);
  assert.equal(cardFind.mock.callCount(), 0);
  await app.close();
});

test("model declares the workspace, card, and newest-payment lookup index", () => {
  assert.ok(
    CardFeePaymentModel.schema
      .indexes()
      .some(
        (entry: [Record<string, number>, Record<string, unknown>]) =>
          JSON.stringify(entry[0]) ===
          JSON.stringify({
            workspaceId: 1,
            userCardId: 1,
            paymentDate: -1,
            createdAt: -1,
          }),
      ),
  );
});

test("GET includes inactive card history and scopes and sorts the query", async (t) => {
  const list = t.mock.method(FeeQueryService, "listCardPayments", async (context: ServiceContext, requestedCardId: string) => {
    assert.equal(context.workspaceId, "workspace-a");
    assert.equal(requestedCardId, cardId);
    return [{ id: feePaymentId, cardId, category: "ANNUAL_CARD_FEE", paymentDate: "2026-07-23", amount: 100000, note: "" }];
  });
  const app = appWithRoutes();
  const response = await app.inject({
    url: `/api/cards/${cardId}/fee-payments`,
    headers: { cookie },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().data[0].amount, 100000);
  assert.equal(list.mock.callCount(), 1);
  await app.close();
});

test("POST validates and creates an actual paid fee in the session scope", async (t) => {
  t.mock.method(CreditCardModel, "findOne", async () => ({ _id: cardId }));
  const create = t.mock.method(
    CardFeePaymentModel,
    "create",
    async (data: Record<string, unknown>) =>
      ({ _id: feePaymentId, ...data }) as never,
  );
  const app = appWithRoutes();
  const response = await app.inject({
    method: "POST",
    url: `/api/cards/${cardId}/fee-payments`,
    headers: { cookie },
    payload: {
      paymentDate: "2026-07-23",
      amount: 299000,
      note: "  Phí quản lý quý 3  ",
    },
  });
  assert.equal(response.statusCode, 201);
  assert.deepEqual(create.mock.calls[0]?.arguments[0], {
    workspaceId: "workspace-a",
    userId: "user-1",
    userCardId: cardId,
    paymentDate: "2026-07-23",
    amount: 299000,
    note: "Phí quản lý quý 3",
  });
  await app.close();
});

test("POST rejects invalid calendar dates, non-positive amounts, and long notes", async (t) => {
  t.mock.method(CreditCardModel, "findOne", async () => ({ _id: cardId }));
  const create = t.mock.method(CardFeePaymentModel, "create");
  const app = appWithRoutes();
  for (const payload of [
    { paymentDate: "2026-02-30", amount: 1 },
    { paymentDate: "2026-07-23", amount: 0 },
    { paymentDate: "2026-07-23", amount: 1.5 },
    { paymentDate: "2026-07-23", amount: 1, note: "x".repeat(1001) },
  ]) {
    const response = await app.inject({
      method: "POST",
      url: `/api/cards/${cardId}/fee-payments`,
      headers: { cookie },
      payload,
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, "INVALID_FEE_PAYMENT");
  }
  assert.equal(create.mock.callCount(), 0);
  await app.close();
});

test("PUT and DELETE scope records by workspace, card, and entry id", async (t) => {
  t.mock.method(CreditCardModel, "findOne", async () => ({ _id: cardId }));
  const update = t.mock.method(
    CardFeePaymentModel,
    "findOneAndUpdate",
    async (_filter: unknown, value: unknown) =>
      ({
        _id: feePaymentId,
        ...(value as { $set: object }).$set,
      }) as never,
  );
  const remove = t.mock.method(
    CardFeePaymentModel,
    "deleteOne",
    async () => ({ deletedCount: 1 }),
  );
  const app = appWithRoutes();
  const filter = {
    _id: feePaymentId,
    workspaceId: "workspace-a",
    userCardId: cardId,
  };
  const updated = await app.inject({
    method: "PUT",
    url: `/api/cards/${cardId}/fee-payments/${feePaymentId}`,
    headers: { cookie },
    payload: { paymentDate: "2026-07-24", amount: 300000, note: "Phí năm" },
  });
  assert.equal(updated.statusCode, 200);
  assert.deepEqual(update.mock.calls[0]?.arguments[0], filter);
  assert.deepEqual(update.mock.calls[0]?.arguments[2], {
    returnDocument: "after",
    runValidators: true,
  });
  const deleted = await app.inject({
    method: "DELETE",
    url: `/api/cards/${cardId}/fee-payments/${feePaymentId}`,
    headers: { cookie },
  });
  assert.equal(deleted.statusCode, 200);
  assert.deepEqual(remove.mock.calls[0]?.arguments[0], filter);
  await app.close();
});

test("missing cards return not found before fee access", async (t) => {
  t.mock.method(CreditCardModel, "findOne", async () => null);
  const update = t.mock.method(CardFeePaymentModel, "findOneAndUpdate");
  const app = appWithRoutes();
  const missingCard = await app.inject({
    method: "PUT",
    url: `/api/cards/${cardId}/fee-payments/${feePaymentId}`,
    headers: { cookie },
    payload: { paymentDate: "2026-07-23", amount: 1 },
  });
  assert.equal(missingCard.statusCode, 404);
  assert.equal(missingCard.json().error.code, "CARD_NOT_FOUND");
  assert.equal(update.mock.callCount(), 0);
  await app.close();
});

test("missing or cross-workspace fee entries return not found", async (t) => {
  t.mock.method(CreditCardModel, "findOne", async () => ({ _id: cardId }));
  t.mock.method(
    CardFeePaymentModel,
    "findOneAndUpdate",
    async () => null,
  );
  const app = appWithRoutes();
  const missingFee = await app.inject({
    method: "PUT",
    url: `/api/cards/${cardId}/fee-payments/${feePaymentId}`,
    headers: { cookie },
    payload: { paymentDate: "2026-07-23", amount: 1 },
  });
  assert.equal(missingFee.statusCode, 404);
  assert.equal(missingFee.json().error.code, "FEE_PAYMENT_NOT_FOUND");
  await app.close();
});
