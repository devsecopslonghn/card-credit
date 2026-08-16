import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { RecurringExpenseService } from "./services/recurring-expense-service.js";
export const registerRecurringExpenseRoutes = (app: FastifyInstance, secret: string) => {
  app.get("/api/finance/recurring-expenses", async (request) => ({ data: await RecurringExpenseService.list(browserServiceContext(request, secret)) }));
  app.post<{ Body: { name: string; categoryId: string; accountId: string; expectedAmount: number; nextDueDate: string } }>("/api/finance/recurring-expenses", async (request, reply) => reply.code(201).send({ data: await RecurringExpenseService.create(browserServiceContext(request, secret), request.body) }));
};
