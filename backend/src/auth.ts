import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import { ApiError } from "./errors.js";

export type Session = { userId: string; email: string; role: string; workspaceId: string };
export const requireAdmin = (request: FastifyRequest, secret: string): Session => {
  const value = request.headers.cookie?.split(";").map((v) => v.trim()).find((v) => v.startsWith("card_credit_session="))?.slice(20);
  const [payload, signature] = value?.split(".") ?? [];
  if (!payload || !signature) throw new ApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new ApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (!session.userId || !session.workspaceId || !session.role) throw new Error("invalid session");
    if (session.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
    return session;
  } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập."); }
};
