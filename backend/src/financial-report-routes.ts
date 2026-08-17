import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { FinancialReportService } from "./services/financial-report-service.js";
import type { AuthRepository } from "./auth-repository.js";
import { ApiError } from "./errors.js";
import { creditStatementReportListSchema, reportQuerySchema, resolveReportDateRange } from "@card-credit/contracts";
import { boundedReadLimit } from "./read-limits.js";

export const registerFinancialReportRoutes = (app: FastifyInstance, secret: string, users?: Pick<AuthRepository, "findUserById">) => {
  app.get<{ Querystring: { from?: string; to?: string; cardId?: string; owner?: string; year?: string; month?: string } }>("/api/financial-reports/summary", async (request) => {
    const context = await browserServiceContext(request, secret, users);
    let range;
    let filters: { cardId?: string; owner?: string } = {};
    try {
      const query = reportQuerySchema.parse(request.query);
      range = resolveReportDateRange(query);
      filters = {
        ...(typeof query.cardId === "string" ? { cardId: query.cardId } : {}),
        ...(typeof query.owner === "string" ? { owner: query.owner } : {}),
      };
    } catch {
      throw new ApiError(400, "INVALID_DATE_RANGE", "Khoảng thời gian báo cáo không hợp lệ.");
    }
    return { data: await FinancialReportService.summary(context, range, Object.keys(filters).length ? filters : undefined) };
  });
  app.get<{ Querystring: { from?: string; to?: string; limit?: string; cursor?: string } }>("/api/financial-reports/credit-statements", async (request) => {
    const range = request.query.from && request.query.to ? { from: request.query.from, to: request.query.to } : undefined;
    const context = await browserServiceContext(request, secret, users);
    if (request.query.limit || request.query.cursor) {
      const page = await FinancialReportService.creditStatementsPage(context, range, { limit: boundedReadLimit(request.query.limit), cursor: request.query.cursor });
      return { data: page };
    }
    const data = await FinancialReportService.creditStatements(context, range);
    return { data: creditStatementReportListSchema.parse(data) };
  });
};
