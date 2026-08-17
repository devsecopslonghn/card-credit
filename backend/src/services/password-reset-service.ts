import crypto from "node:crypto";
import { ApiError } from "../errors.js";
import type { AuthRepository, AuthUser } from "../auth-repository.js";
import { hashPassword } from "../password.js";

type PasswordResetRepository = Pick<AuthRepository, "findResetToken" | "findUserById" | "updatePassword" | "consumeResetTokens">;
export const requirePassword = (value: unknown): string => {
  if (typeof value !== "string" || value.length < 8) throw new ApiError(400, "INVALID_PASSWORD", "Mật khẩu không hợp lệ.", { password: "Mật khẩu phải có ít nhất 8 ký tự." });
  return value;
};
export const hashResetToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export class PasswordResetService {
  static async complete(rawToken: string, password: unknown, repository: PasswordResetRepository): Promise<AuthUser> {
    const normalizedPassword = requirePassword(password);
    if (!rawToken) throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ.");
    const token = await repository.findResetToken(hashResetToken(rawToken), new Date());
    if (!token) throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
    const user = await repository.findUserById(token.userId);
    if (!user?.active || user.lockedAt) throw new ApiError(400, "INVALID_TOKEN", "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
    await repository.updatePassword(user.id, await hashPassword(normalizedPassword));
    await repository.consumeResetTokens(user.id, new Date());
    return user;
  }
}
