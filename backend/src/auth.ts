import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import { ApiError } from "./errors.js";

export type Session = { userId: string; email: string; role: string; workspaceId: string };
export const AUTH_COOKIE_NAME = "card_credit_session";
export const signSession = (session: Session, secret: string) => {
  const payload = Buffer.from(JSON.stringify({ ...session, issuedAt: Date.now() })).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", secret).update(payload).digest("base64url")}`;
};
export const sessionCookie = (value: string, maxAge?: number) =>
  `${AUTH_COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax${maxAge === undefined ? "" : `; Max-Age=${maxAge}`}`;
export const sessionFromRequest = (request: FastifyRequest, secret: string): Session => {
  const value = request.headers.cookie?.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${AUTH_COOKIE_NAME}=`))?.slice(AUTH_COOKIE_NAME.length + 1);
  const [payload, signature] = value?.split(".") ?? [];
  if (!payload || !signature) throw new ApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new ApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (!session.userId || !session.workspaceId || !session.role) throw new Error("invalid session");
    return session;
  } catch { throw new ApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập."); }
};
export const requireAdmin = (request: FastifyRequest, secret: string): Session => {
  const session = sessionFromRequest(request, secret);
  if (session.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
  return session;
};
