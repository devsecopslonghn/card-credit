import { Schema, model, models } from "mongoose";

const PasswordResetTokenSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

PasswordResetTokenSchema.index({ userId: 1, usedAt: 1, expiresAt: 1 });

const PasswordResetToken = models.PasswordResetToken || model("PasswordResetToken", PasswordResetTokenSchema);
export default PasswordResetToken;
