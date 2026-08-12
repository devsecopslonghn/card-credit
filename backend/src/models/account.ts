import mongoose, { Schema } from "mongoose";

const AccountSchema = new Schema(
  {
    userId: { type: String, required: true },
    workspaceId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ["DEBIT", "CASH", "E_WALLET", "CREDIT"], required: true },
    currency: { type: String, default: "VND", enum: ["VND"] },
    active: { type: Boolean, default: true },
    // Only CREDIT accounts use these fields. They are snapshots of card terms.
    creditCardId: { type: Schema.Types.ObjectId, ref: "CreditCard", default: null },
    openingBalance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

AccountSchema.index({ workspaceId: 1, active: 1, createdAt: -1 });
AccountSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
AccountSchema.index({ workspaceId: 1, creditCardId: 1 }, { unique: true, sparse: true });

export const AccountModel =
  (mongoose.models.Account ?? mongoose.model("Account", AccountSchema)) as mongoose.Model<
    Record<string, unknown>
  >;
