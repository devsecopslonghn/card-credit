import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { FinancialTransactionService, type CreateFinancialTransactionInput } from "./services/financial-transaction-service.js";
import type { AuthRepository } from "./auth-repository.js";

type Body = Partial<CreateFinancialTransactionInput>;

export const registerFinancialTransactionRoutes = (app: FastifyInstance, secret: string, users?: Pick<AuthRepository, "findUserById">) => {
  app.get<{ Querystring: { accountId?: string; categoryId?: string; from?: string; to?: string } }>("/api/financial-transactions", async (request) => ({
    data: await FinancialTransactionService.list(await browserServiceContext(request, secret, users), request.query),
  }));

  app.post<{ Body: Body }>("/api/financial-transactions", async (request, reply) => {
    const data = await FinancialTransactionService.create(
      await browserServiceContext(request, secret, users),
      request.body as CreateFinancialTransactionInput,
    );
    return reply.code(201).send({ data });
  });
};
