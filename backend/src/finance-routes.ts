import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { FinanceCategoryService } from "./services/finance-category-service.js";
import { FinanceBudgetService } from "./services/finance-budget-service.js";

export const registerFinanceRoutes = (app: FastifyInstance, secret: string) => {
  app.get("/api/finance/categories", async (request) => ({ data: await FinanceCategoryService.list(browserServiceContext(request, secret)) }));
  app.post("/api/finance/categories/defaults", async (request) => ({ data: await FinanceCategoryService.ensureDefaults(browserServiceContext(request, secret)) }));
  app.post<{ Body: { name: string; parentId?: string } }>("/api/finance/categories", async (request, reply) => reply.code(201).send({ data: await FinanceCategoryService.create(browserServiceContext(request, secret), request.body) }));
  app.put<{ Body: { month: string; categoryId: string; limitAmount: number; warningPercent?: number } }>("/api/finance/budgets", async (request) => ({ data: await FinanceBudgetService.upsert(browserServiceContext(request, secret), request.body) }));
  app.get<{ Querystring: { month: string } }>("/api/finance/budgets/status", async (request) => ({ data: await FinanceBudgetService.status(browserServiceContext(request, secret), request.query.month) }));
};
