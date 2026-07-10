import crypto from "node:crypto";
import { verifyPassword } from "./passwordCore.mjs";

export const AUTH_COOKIE_NAME = "card_credit_session";

class AuthApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const base64UrlEncode = (value) => Buffer.from(value).toString("base64url");
const base64UrlDecode = (value) => Buffer.from(value, "base64url").toString("utf8");

const getSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required.");
  }
  return secret;
};

export const authCookieOptions = (overrides = {}) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: true,
  path: "/",
  ...overrides,
});

export const getConfiguredUsers = () => {
  const rawUsers = process.env.AUTH_USERS_JSON;
  if (!rawUsers) return [];

  const users = JSON.parse(rawUsers);
  if (!Array.isArray(users)) throw new Error("AUTH_USERS_JSON must be an array.");

  return users.map((user) => ({
    id: String(user.id),
    email: String(user.email),
    password: user.password === undefined ? undefined : String(user.password),
    passwordHash: user.passwordHash === undefined ? undefined : String(user.passwordHash),
    role: user.role === "admin" ? "admin" : "user",
    workspaceId: String(user.workspaceId),
    displayName: user.displayName === undefined ? "" : String(user.displayName),
    active: user.active === undefined ? true : Boolean(user.active),
    lockedAt: user.lockedAt || null,
  }));
};

const sign = (payload, secret = getSecret()) =>
  crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export const createSessionCookieValue = (session, secret = getSecret()) => {
  const payload = base64UrlEncode(
    JSON.stringify({
      userId: session.userId,
      email: session.email,
      role: session.role,
      workspaceId: session.workspaceId,
      issuedAt: Date.now(),
    }),
  );
  return `${payload}.${sign(payload, secret)}`;
};

export const verifySessionCookieValue = (cookieValue, secret = getSecret()) => {
  if (!cookieValue || typeof cookieValue !== "string") return null;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const session = JSON.parse(base64UrlDecode(payload));
    if (!session.userId || !session.workspaceId || !session.role) return null;
    return session;
  } catch {
    return null;
  }
};

const cookieFromRequest = (request) => {
  const cookieHeader = request?.headers?.get?.("cookie") ?? "";
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);
};

export const requireAuth = (request) => {
  const session = verifySessionCookieValue(cookieFromRequest(request));
  if (!session) {
    throw new AuthApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
  }
  return session;
};

const sessionFromUser = (user) => ({
  userId: user._id?.toString?.() ?? user.id,
  email: user.email,
  role: user.role === "admin" ? "admin" : "user",
  workspaceId: user.workspaceId,
});

export const authenticateCredentials = async ({ email, password }, deps = {}) => {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const UserModel = deps.UserModel;
  if (!UserModel) {
    throw new Error("UserModel is required for credential authentication.");
  }

  const user = await UserModel.findOne({ email: normalizedEmail }).select("+passwordHash");
  if (!user || !user.active || user.lockedAt || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthApiError(401, "UNAUTHENTICATED", "Email hoặc mật khẩu không đúng.");
  }
  user.lastLoginAt = new Date();
  if (typeof user.save === "function") {
    await user.save();
  }
  return sessionFromUser(user);
};

export const assertAdmin = (session) => {
  if (session.role !== "admin") {
    throw new AuthApiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
  }
  return session;
};

export const defaultTestSession = {
  userId: "test-user",
  email: "test@example.local",
  role: "admin",
  workspaceId: "test-workspace",
};
