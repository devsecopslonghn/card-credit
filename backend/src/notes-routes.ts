import type { FastifyInstance } from "fastify";
import { ApiError } from "./errors.js";
import { sessionFromRequest } from "./auth.js";
import type { NotesRepository } from "./notes.js";

export const registerNotesRoutes = (app: FastifyInstance, repository: NotesRepository, secret: string) => {
  app.get("/api/notes", async (request) => repository.list(sessionFromRequest(request, secret).workspaceId));
  app.post<{ Body: { date?: unknown; content?: unknown } }>("/api/notes", async (request) => {
    const session = sessionFromRequest(request, secret);
    const date = typeof request.body?.date === "string" ? request.body.date : "";
    if (!date) throw new ApiError(400, "INVALID_REQUEST", "Thiếu thông tin ngày!");
    const content = typeof request.body?.content === "string" ? request.body.content.trim() : "";
    if (!content) { await repository.remove(session.workspaceId, date); return { message: "Đã xóa ghi chú trống" }; }
    return repository.upsert(session.workspaceId, date, content);
  });
};
