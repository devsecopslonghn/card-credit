import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { ApiError } from "./errors.js";
import { DEFAULT_SESSION_MAX_AGE_MS, sessionCookie, sessionFromRequest, signSession, type Session } from "./auth.js";
import { hashPassword, verifyPassword } from "./password.js";
import type { AuthRepository, AuthUser } from "./auth-repository.js";

type AuthOptions = {
  repository: AuthRepository;
  secret: string;
  bootstrapToken?: string;
  configuredUsers?: Array<Record<string, unknown>>;
  returnResetToken?: boolean;
  sessionMaxAgeMs?: number;
  audit?: (event: string, request: FastifyRequest, actor?: Session | null, email?: string | null, resource?: Record<string, unknown>) => Promise<void>;
};
const emailOf = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const requirePassword = (value: unknown): string => { if (typeof value !== "string" || value.length < 8) throw new ApiError(400, "INVALID_PASSWORD", "Mật khẩu không hợp lệ.", { password: "Mật khẩu phải có ít nhất 8 ký tự." }); return value; };
const publicUser = (session: Session) => ({ email: session.email, role: session.role, workspaceId: session.workspaceId });
const toSession = (user: AuthUser): Session => ({ userId: user.id, email: user.email, role: user.role, workspaceId: user.workspaceId });
const tokenHash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const registerAuthRoutes = (app: FastifyInstance, options: AuthOptions) => {
  const audit = options.audit ?? (async () => {});
  const authenticate = async (email: string, password: unknown) => {
    const user = await options.repository.findUserByEmail(email);
    if (!user || !user.active || user.lockedAt || !(await verifyPassword(password, user.passwordHash))) throw new ApiError(401, "UNAUTHENTICATED", "Email hoặc mật khẩu không đúng.");
    await options.repository.touchLogin(user.id); return toSession(user);
  };
  app.post<{ Body: Record<string, unknown> }>("/api/auth/login", async (request, reply) => {
    const email = emailOf(request.body?.email);
    try { const session = await authenticate(email, request.body?.password); await audit("LOGIN_SUCCESS", request, session, email, { type: "auth", action: "login" }); reply.header("set-cookie", sessionCookie(signSession(session, options.secret), Math.floor((options.sessionMaxAgeMs ?? DEFAULT_SESSION_MAX_AGE_MS) / 1000))); return { user: publicUser(session) }; }
    catch (error) { await audit("LOGIN_FAILURE", request, null, email, { type: "auth", action: "login", errorCode: error instanceof ApiError ? error.code : "UNKNOWN" }); throw error; }
  });
  app.get("/api/auth/me", async (request) => ({ user: publicUser(sessionFromRequest(request, options.secret)) }));
  app.post("/api/auth/logout", async (request, reply) => { let actor: Session | null = null; try { actor = sessionFromRequest(request, options.secret); } catch { actor = null; } await audit("LOGOUT", request, actor, actor?.email, { type: "auth", action: "logout" }); reply.header("set-cookie", sessionCookie("", 0)); return { ok: true }; });
  app.post<{ Body: Record<string, unknown> }>("/api/auth/register", async (request, reply) => {
    const email = emailOf(request.body?.email); if (!validEmail(email)) throw new ApiError(400, "INVALID_EMAIL", "Email không hợp lệ.", { email: "Vui lòng nhập email hợp lệ." }); const password = requirePassword(request.body?.password);
    if (await options.repository.findUserByEmail(email)) throw new ApiError(409, "EMAIL_ALREADY_REGISTERED", "Email này đã được đăng ký.");
    const role = await options.repository.countUsers() === 0 ? "admin" : "user";
    const workspaceId = typeof request.body?.workspaceId === "string" && request.body.workspaceId.trim() ? request.body.workspaceId.trim() : `${email.split("@")[0]!.replace(/[^a-z0-9]+/g, "-")}-workspace`;
    const user = await options.repository.createUser({ email, passwordHash: await hashPassword(password), role, workspaceId, displayName: typeof request.body?.displayName === "string" ? request.body.displayName.trim() : email.split("@")[0]!, active: true, lockedAt: null });
    const session = toSession(user); await audit("LOGIN_SUCCESS", request, session, email, { type: "auth", action: "register" }); reply.status(201).header("set-cookie", sessionCookie(signSession(session, options.secret), Math.floor((options.sessionMaxAgeMs ?? DEFAULT_SESSION_MAX_AGE_MS) / 1000))); return { user: publicUser(session) };
  });
  app.post<{ Body: Record<string, unknown> }>("/api/auth/forgot-password", async (request) => {
    const email = emailOf(request.body?.email); if (email && !validEmail(email)) throw new ApiError(400, "INVALID_EMAIL", "Email không hợp lệ.", { email: "Vui lòng nhập email hợp lệ." }); const user = email ? await options.repository.findUserByEmail(email) : null; let rawToken: string | null = null;
    if (user?.active && !user.lockedAt) { rawToken = crypto.randomBytes(32).toString("base64url"); await options.repository.createResetToken({ tokenHash: tokenHash(rawToken), userId: user.id, email: user.email, expiresAt: new Date(Date.now() + 30 * 60 * 1000), usedAt: null }); }
    await audit("PASSWORD_RESET_REQUESTED", request, null, email, { type: "auth", action: "forgot-password", delivered: Boolean(rawToken) });
    const host = String(request.headers["x-forwarded-host"] ?? request.headers.host ?? "127.0.0.1:3001");
    const protocol = String(request.headers["x-forwarded-proto"] ?? "http").split(",")[0]!.trim();
    return { ok: true, message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.", ...(rawToken && options.returnResetToken ? { resetLink: `${protocol}://${host}/forgot-password?token=${rawToken}` } : {}) };
  });
  app.post<{ Body: Record<string, unknown> }>("/api/auth/reset-password", async (request, reply) => {
    const password = requirePassword(request.body?.password); const rawToken = typeof request.body?.token === "string" ? request.body.token.trim() : ""; if (!rawToken) throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ."); const token = await options.repository.findResetToken(tokenHash(rawToken), new Date()); if (!token) throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."); const user = await options.repository.findUserById(token.userId); if (!user?.active || user.lockedAt) throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."); await options.repository.updatePassword(user.id, await hashPassword(password)); await options.repository.consumeResetTokens(user.id, new Date()); await audit("PASSWORD_RESET_COMPLETED", request, toSession(user), user.email, { type: "auth", action: "reset-password" }); reply.header("set-cookie", sessionCookie("", 0)); return { ok: true };
  });
  app.post("/api/auth/bootstrap-users", async (request) => {
    if (!options.bootstrapToken) throw new ApiError(503, "BOOTSTRAP_DISABLED", "Bootstrap user API chưa được bật."); const authorization = request.headers.authorization ?? ""; const provided = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : String(request.headers["x-bootstrap-token"] ?? ""); if (provided !== options.bootstrapToken) throw new ApiError(403, "FORBIDDEN", "Bootstrap token không hợp lệ."); if (!options.configuredUsers?.length) throw new ApiError(400, "NO_BOOTSTRAP_USERS", "AUTH_USERS_JSON chưa có user để bootstrap."); const results = [];
    for (const item of options.configuredUsers) { const email = emailOf(item.email); if (!validEmail(email)) throw new ApiError(400, "INVALID_EMAIL", "Email không hợp lệ."); const passwordHash = typeof item.passwordHash === "string" ? item.passwordHash : await hashPassword(requirePassword(item.password)); const user = await options.repository.upsertUser({ email, passwordHash, role: item.role === "admin" ? "admin" : "user", workspaceId: String(item.workspaceId), displayName: typeof item.displayName === "string" ? item.displayName.trim() : email.split("@")[0]!, active: item.active !== false, lockedAt: item.lockedAt ? new Date(String(item.lockedAt)) : null }); results.push(publicUser(toSession(user))); }
    await audit("USER_BOOTSTRAPPED", request, null, null, { type: "auth", action: "bootstrap-users", count: results.length }); return { users: results };
  });
};
