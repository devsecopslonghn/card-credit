import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { FinancialTransactionService, type CreateFinancialTransactionInput } from "./services/financial-transaction-service.js";

type Body = Partial<CreateFinancialTransactionInput>;

export const registerFinancialTransactionRoutes = (app: FastifyInstance, secret: string) => {
  app.get<{ Querystring: { accountId?: string; categoryId?: string; from?: string; to?: string } }>("/api/financial-transactions", async (request) => ({
    data: await FinancialTransactionService.list(browserServiceContext(request, secret), request.query),
  }));

  app.post<{ Body: Body }>("/api/financial-transactions", async (request, reply) => {
    const data = await FinancialTransactionService.create(
      browserServiceContext(request, secret),
      request.body as CreateFinancialTransactionInput,
    );
    return reply.code(201).send({ data });
  });
};
