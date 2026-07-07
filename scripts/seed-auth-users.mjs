import mongoose from "mongoose";
import { hashPassword } from "../lib/auth/passwordCore.mjs";
import { getConfiguredUsers } from "../lib/auth/sessionCore.mjs";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required");
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_AUTH_SEED !== "true") {
  throw new Error("Refusing to seed auth users in production without ALLOW_PRODUCTION_AUTH_SEED=true");
}

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
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

const User = mongoose.models.User || mongoose.model("User", UserSchema);

const users = getConfiguredUsers();

if (users.length === 0) {
  throw new Error("AUTH_USERS_JSON must contain at least one user to seed.");
}

const passwordHashFor = async (user) => {
  if (user.passwordHash) return user.passwordHash;
  if (user.password) return hashPassword(user.password);
  throw new Error(`User ${user.email} must include password or passwordHash.`);
};

async function seed() {
  await mongoose.connect(MONGODB_URI);

  for (const user of users) {
    await User.updateOne(
      { email: user.email.trim().toLowerCase() },
      {
        $set: {
          email: user.email.trim().toLowerCase(),
          passwordHash: await passwordHashFor(user),
          role: user.role,
          workspaceId: user.workspaceId,
          displayName: user.displayName,
          active: user.active,
          lockedAt: user.lockedAt ? new Date(user.lockedAt) : null,
        },
        $setOnInsert: {
          lastLoginAt: null,
        },
      },
      { upsert: true },
    );
  }

  console.log(`Seeded ${users.length} auth user(s).`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
