import mongoose from "mongoose";
import { ApiError } from "../errors.js";
import { CalendarSubscriptionModel } from "../models/calendar-subscription.js";
import { createSubscriptionToken, hashSubscriptionToken, normalizeDeviceLabel } from "../calendar-subscription.js";
import type { ServiceContext } from "./types/service-context.js";

type Data = Record<string, unknown>;

export const safeCalendarSubscription = (doc: Data) => ({
  id: String(doc._id),
  deviceLabel: doc.deviceLabel ?? null,
  createdAt: doc.createdAt,
  lastAccessedAt: doc.lastAccessedAt ?? null,
  revokedAt: doc.revokedAt ?? null,
});

const label = (value: unknown) => {
  try {
    return normalizeDeviceLabel(value);
  } catch {
    throw new ApiError(400, "INVALID_DEVICE_LABEL", "Nhãn thiết bị không hợp lệ.", { deviceLabel: "Nhãn tối đa 80 ký tự." });
  }
};

export class CalendarSubscriptionService {
  static async list(ctx: ServiceContext) {
    const docs = await CalendarSubscriptionModel.find({ userId: ctx.userId, workspaceId: ctx.workspaceId }).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => safeCalendarSubscription(doc as Data));
  }

  static async create(ctx: ServiceContext, deviceLabel: unknown) {
    const token = createSubscriptionToken();
    const doc = await CalendarSubscriptionModel.create({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      deviceLabel: label(deviceLabel),
      tokenHash: hashSubscriptionToken(token),
    });
    return {
      ...safeCalendarSubscription(doc.toObject() as Data),
      subscriptionPath: `/api/calendar-subscriptions/feed/${token}.ics`,
    };
  }

  static async revoke(ctx: ServiceContext, id: string) {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Không tìm thấy lịch đăng ký.");
    const result = await CalendarSubscriptionModel.updateOne(
      { _id: id, userId: ctx.userId, workspaceId: ctx.workspaceId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    if (!result.modifiedCount) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Không tìm thấy lịch đăng ký.");
    return { revoked: true };
  }
}
