import type { FastifyInstance, FastifyRequest } from "fastify";
import { requireAdmin, sessionFromRequest } from "./auth.js";
import type { MasterdataRepository, MasterRecord } from "./masterdata.js";
export const registerMasterdataRoutes = (app: FastifyInstance, repository: MasterdataRepository, secret: string) => {
  const user = (request: FastifyRequest) => sessionFromRequest(request, secret);
  app.get("/api/banks", async (request) => { user(request); return repository.list("banks", "shortname"); });
  app.post<{ Body: MasterRecord }>("/api/banks", async (request, reply) => { requireAdmin(request, secret); const shortname = String(request.body?.shortname ?? "").trim(); if (await repository.findInsensitive("banks", "shortname", shortname)) return reply.status(400).send({ message: `Ngân hàng có mã viết tắt ${shortname} đã tồn tại trong hệ thống.` }); return reply.status(201).send(await repository.create("banks", request.body)); });
  app.put<{ Params: { id: string }; Body: MasterRecord }>("/api/banks/:id", async (request) => { requireAdmin(request, secret); return repository.update("banks", request.params.id, request.body); });
  app.delete<{ Params: { id: string } }>("/api/banks/:id", async (request) => { requireAdmin(request, secret); await repository.remove("banks", request.params.id); return { message: "Đã xóa ngân hàng thành công" }; });
  app.get("/api/cardtypes", async (request) => { user(request); return repository.list("cardtypes", "name"); });
  app.post<{ Body: MasterRecord }>("/api/cardtypes", async (request, reply) => { requireAdmin(request, secret); const name = String(request.body?.name ?? "").trim(); if (await repository.findInsensitive("cardtypes", "name", name)) return reply.status(400).send({ message: `Loại thẻ ${name} đã tồn tại trong hệ thống.` }); return reply.status(201).send(await repository.create("cardtypes", request.body)); });
  app.put<{ Params: { id: string }; Body: MasterRecord }>("/api/cardtypes/:id", async (request) => { requireAdmin(request, secret); return repository.update("cardtypes", request.params.id, request.body); });
  app.delete<{ Params: { id: string } }>("/api/cardtypes/:id", async (request) => { requireAdmin(request, secret); await repository.remove("cardtypes", request.params.id); return { message: "Đã xóa loại thẻ thành công" }; });
};
