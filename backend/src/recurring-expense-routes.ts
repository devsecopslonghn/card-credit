import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { RecurringExpenseService } from "./services/recurring-expense-service.js";
import type { AuthRepository } from "./auth-repository.js";
export const registerRecurringExpenseRoutes = (app: FastifyInstance, secret: string, users?: Pick<AuthRepository, "findUserById">) => {
  app.get("/api/finance/recurring-expenses", async (request) => ({ data: await RecurringExpenseService.list(await browserServiceContext(request, secret, users)) }));
  app.post<{ Body: { name: string; categoryId: string; accountId: string; expectedAmount: number; nextDueDate: string } }>("/api/finance/recurring-expenses", async (request, reply) => reply.code(201).send({ data: await RecurringExpenseService.create(await browserServiceContext(request, secret, users), request.body) }));
};
