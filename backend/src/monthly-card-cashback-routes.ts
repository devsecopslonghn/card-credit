import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { ApiError } from "./errors.js";
import { MonthlyCashbackQueryService } from "./services/monthly-cashback-query-service.js";
import { MonthlyCashbackCommandService } from "./services/monthly-cashback-command-service.js";
import type { AuthRepository } from "./auth-repository.js";

type Data = Record<string, unknown>;
const serialize = (value: unknown) => JSON.parse(JSON.stringify(value)) as Data;
const validYear = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}$/.test(value)) throw new ApiError(400, "INVALID_YEAR", "Năm không hợp lệ.", { year: "Năm phải có dạng YYYY." });
  return value;
};

export const registerMonthlyCardCashbackRoutes = (
  app: FastifyInstance,
  secret: string,
  users: Pick<AuthRepository, "findUserById">,
) => {
  app.get<{ Params: { cardId: string }; Querystring: { year?: string } }>("/api/cards/:cardId/monthly-cashbacks", async (request) => ({ data: await MonthlyCashbackQueryService.list(await browserServiceContext(request, secret, users), request.params.cardId, validYear(request.query.year)) }));
  app.put<{ Params: { cardId: string; period: string }; Body: Data }>("/api/cards/:cardId/monthly-cashbacks/:period", async (request) => ({ data: serialize(await MonthlyCashbackCommandService.upsert(await browserServiceContext(request, secret, users), request.params.cardId, request.params.period, request.body ?? {})) }));
  app.delete<{ Params: { cardId: string; period: string } }>("/api/cards/:cardId/monthly-cashbacks/:period", async (request) => { await MonthlyCashbackCommandService.delete(await browserServiceContext(request, secret, users), request.params.cardId, request.params.period); return { message: "Đã xóa cashback tháng." }; });
};
