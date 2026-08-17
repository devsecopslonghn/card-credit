import { ApiError } from "../errors.js";
import type { NotesRepository, Note } from "../notes.js";
import type { ServiceContext } from "./types/service-context.js";

export type NoteInput = { date?: unknown; content?: unknown };

export class NotesService {
  static async list(context: ServiceContext, repository: Pick<NotesRepository, "list">) {
    return repository.list(context.workspaceId);
  }

  static async save(context: ServiceContext, input: NoteInput, repository: Pick<NotesRepository, "upsert" | "remove">): Promise<Note | { message: string }> {
    const date = typeof input.date === "string" ? input.date : "";
    if (!date) throw new ApiError(400, "INVALID_REQUEST", "Thiếu thông tin ngày!");
    const content = typeof input.content === "string" ? input.content.trim() : "";
    if (!content) {
      await repository.remove(context.workspaceId, date);
      return { message: "Đã xóa ghi chú trống" };
    }
    return repository.upsert(context.workspaceId, date, content);
  }
}
