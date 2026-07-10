import mongoose from "mongoose";

export type AuthUser = {
  id: string; email: string; passwordHash: string; role: "admin" | "user";
  workspaceId: string; displayName: string; active: boolean; lockedAt: Date | null;
};
export type ResetToken = { tokenHash: string; userId: string; email: string; expiresAt: Date; usedAt: Date | null };
export interface AuthRepository {
  countUsers(): Promise<number>;
  findUserByEmail(email: string): Promise<AuthUser | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  createUser(user: Omit<AuthUser, "id">): Promise<AuthUser>;
  upsertUser(user: Omit<AuthUser, "id">): Promise<AuthUser>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  touchLogin(id: string): Promise<void>;
  createResetToken(token: ResetToken): Promise<void>;
  findResetToken(hash: string, now: Date): Promise<ResetToken | null>;
  consumeResetTokens(userId: string, now: Date): Promise<void>;
}

const toUser = (doc: Record<string, unknown> | null): AuthUser | null => doc ? ({
  id: String(doc._id), email: String(doc.email), passwordHash: String(doc.passwordHash),
  role: doc.role === "admin" ? "admin" : "user", workspaceId: String(doc.workspaceId),
  displayName: String(doc.displayName ?? ""), active: doc.active !== false,
  lockedAt: doc.lockedAt instanceof Date ? doc.lockedAt : null,
}) : null;

export class MongoAuthRepository implements AuthRepository {
  private users() { return mongoose.connection.collection("users"); }
  private tokens() { return mongoose.connection.collection("passwordresettokens"); }
  async countUsers() { return this.users().countDocuments(); }
  async findUserByEmail(email: string) { return toUser(await this.users().findOne({ email })); }
  async findUserById(id: string) { return toUser(await this.users().findOne({ _id: new mongoose.Types.ObjectId(id) })); }
  async createUser(user: Omit<AuthUser, "id">) { const result = await this.users().insertOne({ ...user, createdAt: new Date(), updatedAt: new Date() }); return { ...user, id: String(result.insertedId) }; }
  async upsertUser(user: Omit<AuthUser, "id">) { await this.users().updateOne({ email: user.email }, { $set: { ...user, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date(), lastLoginAt: null } }, { upsert: true }); return (await this.findUserByEmail(user.email))!; }
  async updatePassword(id: string, passwordHash: string) { await this.users().updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { passwordHash, passwordChangedAt: new Date(), lastLoginAt: null, updatedAt: new Date() } }); }
  async touchLogin(id: string) { await this.users().updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }); }
  async createResetToken(token: ResetToken) { await this.tokens().insertOne({ ...token, createdAt: new Date(), updatedAt: new Date() }); }
  async findResetToken(tokenHash: string, now: Date) { return await this.tokens().findOne({ tokenHash, usedAt: null, expiresAt: { $gt: now } }) as ResetToken | null; }
  async consumeResetTokens(userId: string, now: Date) { await this.tokens().updateMany({ userId, usedAt: null }, { $set: { usedAt: now, updatedAt: now } }); }
}
