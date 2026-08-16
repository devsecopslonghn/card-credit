import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { FinancialTransactionService, type CreateFinancialTransactionInput } from "./services/financial-transaction-service.js";
import type { AuthRepository } from "./auth-repository.js";
import { createFinancialTransactionInputSchema, financialTransactionListQuerySchema } from "@card-credit/contracts";
import { ApiError } from "./errors.js";

type Body = Partial<CreateFinancialTransactionInput>;

export const registerFinancialTransactionRoutes = (app: FastifyInstance, secret: string, users?: Pick<AuthRepository, "findUserById">) => {
  app.get<{ Querystring: { accountId?: string; categoryId?: string; from?: string; to?: string } }>("/api/financial-transactions", async (request) => ({
    data: await FinancialTransactionService.list(
      await browserServiceContext(request, secret, users),
      (() => {
        const parsed = financialTransactionListQuerySchema.safeParse(request.query);
        if (!parsed.success) throw new ApiError(400, "INVALID_TRANSACTION_FILTER", "Bộ lọc giao dịch không hợp lệ.");
        return parsed.data;
      })(),
    ),
  }));

  app.post<{ Body: Body }>("/api/financial-transactions", async (request, reply) => {
    const parsed = createFinancialTransactionInputSchema.safeParse(request.body);
    if (!parsed.success) throw new ApiError(400, "INVALID_TRANSACTION", "Dữ liệu giao dịch không hợp lệ.");
    const data = await FinancialTransactionService.create(
      await browserServiceContext(request, secret, users),
      parsed.data as CreateFinancialTransactionInput,
    );
    return reply.code(201).send({ data });
  });
};
