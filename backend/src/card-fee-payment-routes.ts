import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { FeeQueryService } from "./services/fee-query-service.js";
import { FeeCommandService } from "./services/fee-command-service.js";
import type { AuthRepository } from "./auth-repository.js";

type Data = Record<string, unknown>;
const serialize = (value: unknown) => JSON.parse(JSON.stringify(value)) as Data;

export const registerCardFeePaymentRoutes = (
  app: FastifyInstance,
  secret: string,
  users: Pick<AuthRepository, "findUserById">,
) => {
  app.get<{ Params: { cardId: string }; Querystring: { limit?: string } }>(
    "/api/cards/:cardId/fee-payments",
    async (request) => ({ data: await FeeQueryService.listCardPayments(await browserServiceContext(request, secret, users), request.params.cardId, request.query.limit) }),
  );

  app.post<{ Params: { cardId: string }; Body: Data }>(
    "/api/cards/:cardId/fee-payments",
    async (request, reply) => {
      const record = await FeeCommandService.createCardPayment(await browserServiceContext(request, secret, users), request.params.cardId, request.body ?? {});
      return reply.code(201).send({ data: serialize(record) });
    },
  );

  app.put<{ Params: { cardId: string; feePaymentId: string }; Body: Data }>(
    "/api/cards/:cardId/fee-payments/:feePaymentId",
    async (request) => ({ data: serialize(await FeeCommandService.updateCardPayment(await browserServiceContext(request, secret, users), request.params.cardId, request.params.feePaymentId, request.body ?? {})) }),
  );

  app.delete<{ Params: { cardId: string; feePaymentId: string } }>(
    "/api/cards/:cardId/fee-payments/:feePaymentId",
    async (request) => { await FeeCommandService.deleteCardPayment(await browserServiceContext(request, secret, users), request.params.cardId, request.params.feePaymentId); return { message: "Đã xóa phí thẻ." }; },
  );
};
