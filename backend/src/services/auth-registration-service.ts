import crypto from "node:crypto";
import { ApiError } from "../errors.js";
import { hashPassword } from "../password.js";
import type { AuthRepository } from "../auth-repository.js";
import type { Session } from "../auth.js";

type RegistrationRepository = Pick<AuthRepository, "findUserByEmail" | "countUsers" | "createUser">;
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const requirePassword = (value: unknown): string => {
  if (typeof value !== "string" || value.length < 8) throw new ApiError(400, "INVALID_PASSWORD", "Mật khẩu không hợp lệ.", { password: "Mật khẩu phải có ít nhất 8 ký tự." });
  return value;
};
const workspaceForEmail = (email: string) => `personal-${crypto.createHash("sha256").update(email).digest("hex").slice(0, 24)}`;

export class AuthRegistrationService {
  static async register(email: string, password: unknown, displayName: unknown, repository: RegistrationRepository): Promise<Session> {
    if (!validEmail(email)) throw new ApiError(400, "INVALID_EMAIL", "Email không hợp lệ.", { email: "Vui lòng nhập email hợp lệ." });
    const normalizedPassword = requirePassword(password);
    if (await repository.findUserByEmail(email)) throw new ApiError(409, "EMAIL_ALREADY_REGISTERED", "Email này đã được đăng ký.");
    const role = await repository.countUsers() === 0 ? "admin" : "user";
    const user = await repository.createUser({
      email,
      passwordHash: await hashPassword(normalizedPassword),
      role,
      workspaceId: workspaceForEmail(email),
      displayName: typeof displayName === "string" ? displayName.trim() : email.split("@")[0]!,
      active: true,
      lockedAt: null,
    });
    return { userId: user.id, email: user.email, role: user.role, workspaceId: user.workspaceId, sessionVersion: user.sessionVersion ?? 0 };
  }
}
