import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { FinancialReportService } from "./services/financial-report-service.js";

export const registerFinancialReportRoutes = (app: FastifyInstance, secret: string) => {
  app.get<{ Querystring: { from?: string; to?: string } }>("/api/financial-reports/summary", async (request) => {
    const today = new Date().toISOString().slice(0, 10);
    const from = request.query.from ?? `${today.slice(0, 7)}-01`;
    const to = request.query.to ?? today;
    return { data: await FinancialReportService.summary(browserServiceContext(request, secret), { from, to }) };
  });
  app.get<{ Querystring: { from?: string; to?: string } }>("/api/financial-reports/credit-statements", async (request) => {
    const range = request.query.from && request.query.to ? { from: request.query.from, to: request.query.to } : undefined;
    return { data: await FinancialReportService.creditStatements(browserServiceContext(request, secret), range) };
  });
};
