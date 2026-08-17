import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { FinancialReportService } from "./services/financial-report-service.js";
import type { AuthRepository } from "./auth-repository.js";
import { ApiError } from "./errors.js";
import { creditStatementReportListSchema, reportQuerySchema, resolveReportDateRange } from "@card-credit/contracts";

export const registerFinancialReportRoutes = (app: FastifyInstance, secret: string, users?: Pick<AuthRepository, "findUserById">) => {
  app.get<{ Querystring: { from?: string; to?: string; cardId?: string } }>("/api/financial-reports/summary", async (request) => {
    const context = await browserServiceContext(request, secret, users);
    let range;
    let cardId: string | undefined;
    try {
      const query = reportQuerySchema.parse(request.query);
      range = resolveReportDateRange(query);
      cardId = typeof query.cardId === "string" ? query.cardId : undefined;
    } catch {
      throw new ApiError(400, "INVALID_DATE_RANGE", "Khoảng thời gian báo cáo không hợp lệ.");
    }
    return { data: await FinancialReportService.summary(context, range, cardId ? { cardId } : undefined) };
  });
  app.get<{ Querystring: { from?: string; to?: string } }>("/api/financial-reports/credit-statements", async (request) => {
    const range = request.query.from && request.query.to ? { from: request.query.from, to: request.query.to } : undefined;
    const data = await FinancialReportService.creditStatements(await browserServiceContext(request, secret, users), range);
    return { data: creditStatementReportListSchema.parse(data) };
  });
};
