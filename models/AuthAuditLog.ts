import { Schema, model, models } from "mongoose";

const AuthAuditLogSchema = new Schema(
  {
    event: {
      type: String,
      required: true,
      enum: [
        "LOGIN_SUCCESS",
        "LOGIN_FAILURE",
        "LOGOUT",
        "PASSWORD_RESET_REQUESTED",
        "PASSWORD_RESET_COMPLETED",
        "CATALOG_PRODUCT_CREATED",
        "CATALOG_PRODUCT_UPDATED",
        "CATALOG_PROVIDER_BULK_UPDATED",
      ],
      index: true,
    },
    userId: { type: String, default: null, index: true },
    email: { type: String, default: null, index: true },
    role: { type: String, default: null },
    workspaceId: { type: String, default: null, index: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    correlationId: { type: String, default: null, index: true },
    resource: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

AuthAuditLogSchema.index({ event: 1, createdAt: -1 });
AuthAuditLogSchema.index({ userId: 1, createdAt: -1 });
AuthAuditLogSchema.index({ email: 1, createdAt: -1 });
AuthAuditLogSchema.index({ "resource.type": 1, "resource.id": 1, createdAt: -1 });

const AuthAuditLog = models.AuthAuditLog || model("AuthAuditLog", AuthAuditLogSchema);
export default AuthAuditLog;
