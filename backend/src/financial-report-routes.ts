import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { FinancialReportService } from "./services/financial-report-service.js";
import type { AuthRepository } from "./auth-repository.js";

export const registerFinancialReportRoutes = (app: FastifyInstance, secret: string, users?: Pick<AuthRepository, "findUserById">) => {
  app.get<{ Querystring: { from?: string; to?: string } }>("/api/financial-reports/summary", async (request) => {
    const today = new Date().toISOString().slice(0, 10);
    const from = request.query.from ?? `${today.slice(0, 7)}-01`;
    const to = request.query.to ?? today;
    return { data: await FinancialReportService.summary(await browserServiceContext(request, secret, users), { from, to }) };
  });
  app.get<{ Querystring: { from?: string; to?: string } }>("/api/financial-reports/credit-statements", async (request) => {
    const range = request.query.from && request.query.to ? { from: request.query.from, to: request.query.to } : undefined;
    return { data: await FinancialReportService.creditStatements(await browserServiceContext(request, secret, users), range) };
  });
};
