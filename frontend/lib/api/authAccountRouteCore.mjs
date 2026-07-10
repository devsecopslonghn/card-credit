import crypto from "node:crypto";
import { NextResponse } from "next/server.js";
import { logAuthEvent } from "../audit/logAuthEventCore.mjs";
import { hashPassword } from "../auth/passwordCore.mjs";
import { ApiError, handleApiError, parseJsonRequest } from "./errorsCore.mjs";

const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const normalizeDisplayName = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || fallback;
};

const workspaceFromEmail = (email) => {
  const localPart = email.split("@")[0] || "workspace";
  const slug = localPart.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "user"}-workspace`;
};

const requireValidEmail = (email) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "INVALID_EMAIL", "Email không hợp lệ.", { email: "Vui lòng nhập email hợp lệ." });
  }
};

const requireValidPassword = (password) => {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, "INVALID_PASSWORD", "Mật khẩu không hợp lệ.", {
      password: `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`,
    });
  }
};

const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");

const asUserId = (user) => user?._id?.toString?.() ?? user?.id;

const findUserByEmail = (UserModel, email) => {
  const query = UserModel.findOne({ email });
  return typeof query?.select === "function" ? query.select("+passwordHash") : query;
};

const shouldReturnResetLink = () =>
  process.env.PASSWORD_RESET_RETURN_TOKEN === "true";

const resetUrlFor = (request, token) => {
  const url = new URL(request.url);
  url.pathname = "/forgot-password";
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
};

const bootstrapTokenFrom = (request) => {
  const authorization = request.headers?.get?.("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.headers?.get?.("x-bootstrap-token") ?? "";
};

const assertBootstrapToken = (request) => {
  const expected = process.env.AUTH_BOOTSTRAP_TOKEN;
  if (!expected) {
    throw new ApiError(503, "BOOTSTRAP_DISABLED", "Bootstrap user API chưa được bật.");
  }
  const actual = bootstrapTokenFrom(request);
  if (!actual || actual !== expected) {
    throw new ApiError(403, "FORBIDDEN", "Bootstrap token không hợp lệ.");
  }
};

const passwordHashFor = async (user) => {
  if (user.passwordHash) return user.passwordHash;
  if (user.password) return hashPassword(user.password);
  throw new ApiError(400, "INVALID_BOOTSTRAP_USER", `User ${user.email} phải có password hoặc passwordHash.`);
};

export const createRegisterRouteHandler = ({
  connectToDatabase,
  UserModel,
  authenticateCredentials,
  createSessionCookieValue,
  authCookieName,
  authCookieOptions,
  AuditLogModel,
}) => async function POST(request) {
  let email = null;
  try {
    const body = await parseJsonRequest(request);
    email = normalizeEmail(body.email);
    requireValidEmail(email);
    requireValidPassword(body.password);

    await connectToDatabase();

    const existing = await findUserByEmail(UserModel, email);
    if (existing) {
      throw new ApiError(409, "EMAIL_ALREADY_REGISTERED", "Email này đã được đăng ký.");
    }

    const userCount = typeof UserModel.countDocuments === "function" ? await UserModel.countDocuments() : 1;
    const role = userCount === 0 ? "admin" : "user";
    const workspaceId =
      typeof body.workspaceId === "string" && body.workspaceId.trim()
        ? body.workspaceId.trim()
        : workspaceFromEmail(email);
    const displayName = normalizeDisplayName(body.displayName, email.split("@")[0]);

    await UserModel.create({
      email,
      passwordHash: await hashPassword(body.password),
      role,
      workspaceId,
      displayName,
      active: true,
      lockedAt: null,
    });

    const session = await authenticateCredentials({ email, password: body.password }, { UserModel });
    await logAuthEvent({
      AuditLogModel,
      event: "LOGIN_SUCCESS",
      request,
      actor: session,
      resource: { type: "auth", action: "register" },
    });

    const response = NextResponse.json(
      {
        user: {
          email: session.email,
          role: session.role,
          workspaceId: session.workspaceId,
        },
      },
      { status: 201 },
    );
    response.cookies.set(authCookieName, createSessionCookieValue(session), authCookieOptions());
    return response;
  } catch (error) {
    await logAuthEvent({
      AuditLogModel,
      event: "LOGIN_FAILURE",
      request,
      email,
      resource: { type: "auth", action: "register", errorCode: error?.code ?? "UNKNOWN" },
    });
    return handleApiError("POST /api/auth/register failed", error);
  }
};

export const createForgotPasswordRouteHandler = ({
  connectToDatabase,
  UserModel,
  PasswordResetTokenModel,
  AuditLogModel,
}) => async function POST(request) {
  let email = null;
  try {
    const body = await parseJsonRequest(request);
    email = normalizeEmail(body.email);
    if (email) requireValidEmail(email);

    await connectToDatabase();
    const user = email ? await findUserByEmail(UserModel, email) : null;
    let resetLink = null;

    if (user && user.active !== false && !user.lockedAt) {
      const rawToken = crypto.randomBytes(32).toString("base64url");
      await PasswordResetTokenModel.create({
        userId: asUserId(user),
        email: user.email,
        tokenHash: tokenHash(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        usedAt: null,
      });
      resetLink = resetUrlFor(request, rawToken);
    }

    await logAuthEvent({
      AuditLogModel,
      event: "PASSWORD_RESET_REQUESTED",
      request,
      email,
      resource: { type: "auth", action: "forgot-password", delivered: Boolean(resetLink) },
    });

    return NextResponse.json({
      ok: true,
      message: "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi.",
      ...(resetLink && shouldReturnResetLink() ? { resetLink } : {}),
    });
  } catch (error) {
    return handleApiError("POST /api/auth/forgot-password failed", error);
  }
};

export const createResetPasswordRouteHandler = ({
  connectToDatabase,
  UserModel,
  PasswordResetTokenModel,
  AuditLogModel,
  authCookieName,
  authCookieOptions,
}) => async function POST(request) {
  let email = null;
  try {
    const body = await parseJsonRequest(request);
    const token = typeof body.token === "string" ? body.token.trim() : "";
    requireValidPassword(body.password);
    if (!token) {
      throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ.");
    }

    await connectToDatabase();
    const resetToken = await PasswordResetTokenModel.findOne({
      tokenHash: tokenHash(token),
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!resetToken) {
      throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
    }

    const user = await UserModel.findById(resetToken.userId);
    email = resetToken.email;
    if (!user || user.active === false || user.lockedAt) {
      throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
    }

    user.passwordHash = await hashPassword(body.password);
    user.lastLoginAt = null;
    user.passwordChangedAt = new Date();
    await user.save();

    resetToken.usedAt = new Date();
    await resetToken.save();
    if (typeof PasswordResetTokenModel.updateMany === "function") {
      await PasswordResetTokenModel.updateMany(
        { userId: asUserId(user), usedAt: null },
        { $set: { usedAt: new Date() } },
      );
    }

    await logAuthEvent({
      AuditLogModel,
      event: "PASSWORD_RESET_COMPLETED",
      request,
      actor: {
        userId: asUserId(user),
        email: user.email,
        role: user.role,
        workspaceId: user.workspaceId,
      },
      resource: { type: "auth", action: "reset-password" },
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(authCookieName, "", authCookieOptions({ maxAge: 0 }));
    return response;
  } catch (error) {
    await logAuthEvent({
      AuditLogModel,
      event: "PASSWORD_RESET_REQUESTED",
      request,
      email,
      resource: { type: "auth", action: "reset-password", errorCode: error?.code ?? "UNKNOWN" },
    });
    return handleApiError("POST /api/auth/reset-password failed", error);
  }
};

export const createBootstrapUsersRouteHandler = ({
  connectToDatabase,
  UserModel,
  getConfiguredUsers,
  AuditLogModel,
}) => async function POST(request) {
  try {
    assertBootstrapToken(request);
    const users = getConfiguredUsers();
    if (!Array.isArray(users) || users.length === 0) {
      throw new ApiError(400, "NO_BOOTSTRAP_USERS", "AUTH_USERS_JSON chưa có user để bootstrap.");
    }

    await connectToDatabase();
    const results = [];

    for (const user of users) {
      const email = normalizeEmail(user.email);
      requireValidEmail(email);

      await UserModel.updateOne(
        { email },
        {
          $set: {
            email,
            passwordHash: await passwordHashFor(user),
            role: user.role === "admin" ? "admin" : "user",
            workspaceId: String(user.workspaceId),
            displayName: normalizeDisplayName(user.displayName, email.split("@")[0]),
            active: user.active,
            lockedAt: user.lockedAt ? new Date(user.lockedAt) : null,
          },
          $setOnInsert: {
            lastLoginAt: null,
          },
        },
        { upsert: true },
      );

      results.push({
        email,
        role: user.role === "admin" ? "admin" : "user",
        workspaceId: String(user.workspaceId),
      });
    }

    await logAuthEvent({
      AuditLogModel,
      event: "USER_BOOTSTRAPPED",
      request,
      resource: { type: "auth", action: "bootstrap-users", count: results.length },
    });

    return NextResponse.json({ users: results });
  } catch (error) {
    return handleApiError("POST /api/auth/bootstrap-users failed", error);
  }
};
