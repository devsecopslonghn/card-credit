import assert from "node:assert/strict";
import test from "node:test";
import { CardFeePaymentModel } from "../src/models/card-fee-payment.js";
import { CardQueryService } from "../src/services/card-query-service.js";
import { FeeCommandService } from "../src/services/fee-command-service.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

const context: ServiceContext = { workspaceId: "workspace-a", userId: "user-a", role: "user", channel: "browser", correlationId: "fee-command-test" };
const cardId = "507f1f77bcf86cd799439011";
const paymentId = "507f1f77bcf86cd799439012";

test("fee command service scopes card payment commands through canonical card ownership", async (t) => {
  const cardGet = t.mock.method(CardQueryService, "get", async (ctx: ServiceContext, requestedCardId: string) => {
    assert.equal(ctx.workspaceId, context.workspaceId);
    assert.equal(requestedCardId, cardId);
    return { id: cardId } as never;
  });
  const create = t.mock.method(CardFeePaymentModel, "create", async (value: Record<string, unknown>) => ({ _id: paymentId, ...value }) as never);
  const created = await FeeCommandService.createCardPayment(context, cardId, { paymentDate: "2026-07-23", amount: 299000, note: "  Phí năm  " });
  assert.equal(cardGet.mock.callCount(), 1);
  assert.deepEqual(create.mock.calls[0]?.arguments[0], { workspaceId: "workspace-a", userId: "user-a", userCardId: cardId, paymentDate: "2026-07-23", amount: 299000, note: "Phí năm" });
  assert.equal((created as { _id: string })._id, paymentId);

  const update = t.mock.method(CardFeePaymentModel, "findOneAndUpdate", async (_filter: unknown, value: unknown) => ({ _id: paymentId, ...(value as { $set: object }).$set }) as never);
  await FeeCommandService.updateCardPayment(context, cardId, paymentId, { paymentDate: "2026-07-24", amount: 300000, note: "Thanh toán" });
  assert.deepEqual(update.mock.calls[0]?.arguments[0], { _id: paymentId, workspaceId: "workspace-a", userCardId: cardId });
  assert.deepEqual(update.mock.calls[0]?.arguments[2], { returnDocument: "after", runValidators: true });

  const remove = t.mock.method(CardFeePaymentModel, "deleteOne", async () => ({ deletedCount: 1 }));
  await FeeCommandService.deleteCardPayment(context, cardId, paymentId);
  assert.deepEqual(remove.mock.calls[0]?.arguments[0], { _id: paymentId, workspaceId: "workspace-a", userCardId: cardId });
});

test("Fee Center commands preserve compatibility payload and delete response", async (t) => {
  t.mock.method(CardQueryService, "get", async () => ({ id: cardId } as never));
  const create = t.mock.method(CardFeePaymentModel, "create", async (value: Record<string, unknown>) => value as never);
  await FeeCommandService.createCenter(context, { cardId, category: "MANAGEMENT_FEE", paymentDate: "2026-07-23", amount: 100000, note: null });
  assert.deepEqual(create.mock.calls[0]?.arguments[0], { workspaceId: "workspace-a", userId: "user-a", userCardId: cardId, category: "MANAGEMENT_FEE", paymentDate: "2026-07-23", amount: 100000, note: "" });

  const update = t.mock.method(CardFeePaymentModel, "findOneAndUpdate", async (_filter: unknown, value: unknown) => value as never);
  await FeeCommandService.updateCenter(context, paymentId, { category: "OTHER_FEE", paymentDate: "2026-07-24", amount: 200000 });
  assert.deepEqual((update.mock.calls[0]?.arguments[1] as { $set: object }).$set, { userCardId: undefined, category: "OTHER_FEE", paymentDate: "2026-07-24", amount: 200000, note: "" });

  const remove = t.mock.method(CardFeePaymentModel, "deleteOne", async () => ({ deletedCount: 0 }));
  assert.deepEqual(await FeeCommandService.deleteCenter(context, paymentId), { deletedId: paymentId });
  assert.deepEqual(remove.mock.calls[0]?.arguments[0], { _id: paymentId, workspaceId: "workspace-a" });
});
