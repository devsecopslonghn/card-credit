import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { ApiError } from "./errors.js";
import { DEFAULT_SESSION_MAX_AGE_MS, sessionCookie, sessionFromRequest, signSession, type Session } from "./auth.js";
import { hashPassword } from "./password.js";
import type { AuthRepository, AuthUser } from "./auth-repository.js";
import { browserActorContext } from "./context.js";
import { authSessionListSchema, authSessionSchema } from "@card-credit/contracts";
import type { MailService } from "./mail-service.js";
import { AuthSessionService } from "./services/auth-session-service.js";

export type AuthOptions = {
  repository: AuthRepository;
  secret: string;
  bootstrapToken?: string;
  configuredUsers?: Array<Record<string, unknown>>;
  returnResetToken?: boolean;
  mail?: Pick<MailService, "sendPasswordResetEmail">;
  sessionMaxAgeMs?: number;
  audit?: (event: string, request: FastifyRequest, actor?: Session | null, email?: string | null, resource?: Record<string, unknown>) => Promise<void>;
};
const emailOf = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const requirePassword = (value: unknown): string => { if (typeof value !== "string" || value.length < 8) throw new ApiError(400, "INVALID_PASSWORD", "Mật khẩu không hợp lệ.", { password: "Mật khẩu phải có ít nhất 8 ký tự." }); return value; };
const publicUser = (session: Session) => ({ email: session.email, role: session.role, workspaceId: session.workspaceId });
const toSession = (user: AuthUser): Session => ({ userId: user.id, email: user.email, role: user.role, workspaceId: user.workspaceId, sessionVersion: user.sessionVersion ?? 0 });
const workspaceForEmail = (email: string) => `personal-${crypto.createHash("sha256").update(email).digest("hex").slice(0, 24)}`;
const tokenHash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const registerAuthRoutes = (app: FastifyInstance, options: AuthOptions) => {
  const audit = options.audit ?? (async () => {});
  app.post<{ Body: Record<string, unknown> }>("/api/auth/login", async (request, reply) => {
    const email = emailOf(request.body?.email);
    try { const session = await AuthSessionService.login(email, request.body?.password, options.repository); const safeUser = authSessionSchema.parse(publicUser(session)); await audit("LOGIN_SUCCESS", request, session, email, { type: "auth", action: "login" }); reply.header("set-cookie", sessionCookie(signSession(session, options.secret), Math.floor((options.sessionMaxAgeMs ?? DEFAULT_SESSION_MAX_AGE_MS) / 1000))); return { user: safeUser }; }
    catch (error) { await audit("LOGIN_FAILURE", request, null, email, { type: "auth", action: "login", errorCode: error instanceof ApiError ? error.code : "UNKNOWN" }); throw error; }
  });
  app.get("/api/auth/me", async (request) => { const { actor } = await browserActorContext(request, options.secret, options.repository); return { user: authSessionSchema.parse(publicUser(actor)) }; });
  app.post("/api/auth/logout", async (request, reply) => { let actor: Session | null = null; try { actor = sessionFromRequest(request, options.secret); } catch { actor = null; } await audit("LOGOUT", request, actor, actor?.email, { type: "auth", action: "logout" }); reply.header("set-cookie", sessionCookie("", 0)); return { ok: true }; });
  app.post<{ Body: Record<string, unknown> }>("/api/auth/register", async (request, reply) => {
    const email = emailOf(request.body?.email); if (!validEmail(email)) throw new ApiError(400, "INVALID_EMAIL", "Email không hợp lệ.", { email: "Vui lòng nhập email hợp lệ." }); const password = requirePassword(request.body?.password);
    if ("workspaceId" in (request.body ?? {})) throw new ApiError(400, "WORKSPACE_SELECTION_NOT_ALLOWED", "Workspace được cấp tự động khi đăng ký.");
    if (await options.repository.findUserByEmail(email)) throw new ApiError(409, "EMAIL_ALREADY_REGISTERED", "Email này đã được đăng ký.");
    const role = await options.repository.countUsers() === 0 ? "admin" : "user";
    const workspaceId = workspaceForEmail(email);
    const user = await options.repository.createUser({ email, passwordHash: await hashPassword(password), role, workspaceId, displayName: typeof request.body?.displayName === "string" ? request.body.displayName.trim() : email.split("@")[0]!, active: true, lockedAt: null });
    const session = toSession(user); const safeUser = authSessionSchema.parse(publicUser(session)); await audit("LOGIN_SUCCESS", request, session, email, { type: "auth", action: "register" }); reply.status(201).header("set-cookie", sessionCookie(signSession(session, options.secret), Math.floor((options.sessionMaxAgeMs ?? DEFAULT_SESSION_MAX_AGE_MS) / 1000))); return { user: safeUser };
  });
  app.post<{ Body: Record<string, unknown> }>("/api/auth/forgot-password", async (request) => {
    const email = emailOf(request.body?.email); if (email && !validEmail(email)) throw new ApiError(400, "INVALID_EMAIL", "Email không hợp lệ.", { email: "Vui lòng nhập email hợp lệ." }); const user = email ? await options.repository.findUserByEmail(email) : null; let rawToken: string | null = null;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    if (user?.active && !user.lockedAt) { rawToken = crypto.randomBytes(32).toString("base64url"); await options.repository.createResetToken({ tokenHash: tokenHash(rawToken), userId: user.id, email: user.email, expiresAt, usedAt: null }); }
    const host = String(request.headers["x-forwarded-host"] ?? request.headers.host ?? "127.0.0.1:3001");
    const protocol = String(request.headers["x-forwarded-proto"] ?? "http").split(",")[0]!.trim();
    const resetLink = rawToken ? `${protocol}://${host}/forgot-password?token=${rawToken}` : null;
    let delivered = false;
    if (user && resetLink && options.mail?.sendPasswordResetEmail) {
      try { await options.mail.sendPasswordResetEmail({ to: user.email, resetLink, expiresAt }); delivered = true; } catch { delivered = false; }
    }
    await audit("PASSWORD_RESET_REQUESTED", request, null, email, { type: "auth", action: "forgot-password", delivered });
    return { ok: true, message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.", ...(resetLink && options.returnResetToken ? { resetLink } : {}) };
  });
  app.post<{ Body: Record<string, unknown> }>("/api/auth/reset-password", async (request, reply) => {
    const password = requirePassword(request.body?.password); const rawToken = typeof request.body?.token === "string" ? request.body.token.trim() : ""; if (!rawToken) throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ."); const token = await options.repository.findResetToken(tokenHash(rawToken), new Date()); if (!token) throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."); const user = await options.repository.findUserById(token.userId); if (!user?.active || user.lockedAt) throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."); await options.repository.updatePassword(user.id, await hashPassword(password)); await options.repository.consumeResetTokens(user.id, new Date()); await audit("PASSWORD_RESET_COMPLETED", request, toSession(user), user.email, { type: "auth", action: "reset-password" }); reply.header("set-cookie", sessionCookie("", 0)); return { ok: true };
  });
  app.post("/api/auth/bootstrap-users", async (request) => {
    if (!options.bootstrapToken) throw new ApiError(503, "BOOTSTRAP_DISABLED", "Bootstrap user API chưa được bật."); const authorization = request.headers.authorization ?? ""; const provided = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : String(request.headers["x-bootstrap-token"] ?? ""); if (provided !== options.bootstrapToken) throw new ApiError(403, "FORBIDDEN", "Bootstrap token không hợp lệ."); if (!options.configuredUsers?.length) throw new ApiError(400, "NO_BOOTSTRAP_USERS", "AUTH_USERS_JSON chưa có user để bootstrap."); const results = [];
    for (const item of options.configuredUsers) { const email = emailOf(item.email); if (!validEmail(email)) throw new ApiError(400, "INVALID_EMAIL", "Email không hợp lệ."); const passwordHash = typeof item.passwordHash === "string" ? item.passwordHash : await hashPassword(requirePassword(item.password)); const user = await options.repository.upsertUser({ email, passwordHash, role: item.role === "admin" ? "admin" : "user", workspaceId: String(item.workspaceId), displayName: typeof item.displayName === "string" ? item.displayName.trim() : email.split("@")[0]!, active: item.active !== false, lockedAt: item.lockedAt ? new Date(String(item.lockedAt)) : null }); results.push(authSessionSchema.parse(publicUser(toSession(user)))); }
    await audit("USER_BOOTSTRAPPED", request, null, null, { type: "auth", action: "bootstrap-users", count: results.length }); return { users: authSessionListSchema.parse(results) };
  });
};
