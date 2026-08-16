import type { FastifyInstance, FastifyRequest } from "fastify";
import type { AuthRepository } from "./auth-repository.js";
import { browserServiceContext } from "./context.js";
import { ApiError } from "./errors.js";
import type { MasterdataRepository, MasterRecord } from "./masterdata.js";
import { masterBankListSchema, masterCardTypeListSchema } from "@card-credit/contracts";
import { MasterdataQueryService } from "./services/masterdata-query-service.js";
export const registerMasterdataRoutes = (app: FastifyInstance, repository: MasterdataRepository, secret: string, users: Pick<AuthRepository, "findUserById">) => {
  const context = (request: FastifyRequest) => browserServiceContext(request, secret, users);
  const admin = async (request: FastifyRequest) => {
    const trusted = await context(request);
    if (trusted.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
    return trusted;
  };
  app.get("/api/banks", async (request) => masterBankListSchema.parse(await MasterdataQueryService.listBanks(await context(request), repository)));
  app.post<{ Body: MasterRecord }>("/api/banks", async (request, reply) => { await admin(request); const shortname = String(request.body?.shortname ?? "").trim(); if (await repository.findInsensitive("banks", "shortname", shortname)) return reply.status(400).send({ message: `Ngân hàng có mã viết tắt ${shortname} đã tồn tại trong hệ thống.` }); return reply.status(201).send(await repository.create("banks", request.body)); });
  app.put<{ Params: { id: string }; Body: MasterRecord }>("/api/banks/:id", async (request) => { await admin(request); return repository.update("banks", request.params.id, request.body); });
  app.delete<{ Params: { id: string } }>("/api/banks/:id", async (request) => { await admin(request); await repository.remove("banks", request.params.id); return { message: "Đã xóa ngân hàng thành công" }; });
  app.get("/api/cardtypes", async (request) => masterCardTypeListSchema.parse(await MasterdataQueryService.listCardTypes(await context(request), repository)));
  app.post<{ Body: MasterRecord }>("/api/cardtypes", async (request, reply) => { await admin(request); const name = String(request.body?.name ?? "").trim(); if (await repository.findInsensitive("cardtypes", "name", name)) return reply.status(400).send({ message: `Loại thẻ ${name} đã tồn tại trong hệ thống.` }); return reply.status(201).send(await repository.create("cardtypes", request.body)); });
  app.put<{ Params: { id: string }; Body: MasterRecord }>("/api/cardtypes/:id", async (request) => { await admin(request); return repository.update("cardtypes", request.params.id, request.body); });
  app.delete<{ Params: { id: string } }>("/api/cardtypes/:id", async (request) => { await admin(request); await repository.remove("cardtypes", request.params.id); return { message: "Đã xóa loại thẻ thành công" }; });
};
