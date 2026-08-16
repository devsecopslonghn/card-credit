import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { FinanceCategoryService } from "./services/finance-category-service.js";
import { FinanceBudgetService } from "./services/finance-budget-service.js";
import type { AuthRepository } from "./auth-repository.js";

export const registerFinanceRoutes = (app: FastifyInstance, secret: string, users?: Pick<AuthRepository, "findUserById">) => {
  app.get("/api/finance/categories", async (request) => ({ data: await FinanceCategoryService.list(await browserServiceContext(request, secret, users)) }));
  app.post("/api/finance/categories/defaults", async (request) => ({ data: await FinanceCategoryService.ensureDefaults(await browserServiceContext(request, secret, users)) }));
  app.post<{ Body: { name: string; parentId?: string } }>("/api/finance/categories", async (request, reply) => reply.code(201).send({ data: await FinanceCategoryService.create(await browserServiceContext(request, secret, users), request.body) }));
  app.put<{ Body: { month: string; categoryId: string; limitAmount: number; warningPercent?: number } }>("/api/finance/budgets", async (request) => ({ data: await FinanceBudgetService.upsert(await browserServiceContext(request, secret, users), request.body) }));
  app.get<{ Querystring: { month: string } }>("/api/finance/budgets/status", async (request) => ({ data: await FinanceBudgetService.status(await browserServiceContext(request, secret, users), request.query.month) }));
};
