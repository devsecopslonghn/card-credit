import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "user"], default: "user", index: true },
    workspaceId: { type: String, required: true, index: true },
    displayName: { type: String, default: "" },
    active: { type: Boolean, default: true, index: true },
    lockedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ workspaceId: 1, role: 1 });

const User = models.User || model("User", UserSchema);
export default User;
