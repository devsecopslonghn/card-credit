import { ApiError } from "@/lib/api/errors";

export const MAX_OWNER_LENGTH = 120;

export const normalizeOwner = (owner: unknown): string => {
  if (typeof owner !== "string") {
    throw new ApiError(400, "INVALID_OWNER", "Tên chủ thẻ không hợp lệ.", {
      owner: "Tên chủ thẻ là bắt buộc.",
    });
  }

  const normalized = owner.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new ApiError(400, "INVALID_OWNER", "Tên chủ thẻ không hợp lệ.", {
      owner: "Tên chủ thẻ không được để trống.",
    });
  }

  if (normalized.length > MAX_OWNER_LENGTH) {
    throw new ApiError(400, "INVALID_OWNER", "Tên chủ thẻ không hợp lệ.", {
      owner: `Tên chủ thẻ không được vượt quá ${MAX_OWNER_LENGTH} ký tự.`,
    });
  }

  return normalized;
};
