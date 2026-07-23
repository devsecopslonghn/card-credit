import mongoose, { Schema } from "mongoose";

const CardFeePaymentSchema = new Schema(
  {
    workspaceId: { type: String, required: true },
    userId: { type: String, required: true },
    userCardId: {
      type: Schema.Types.ObjectId,
      ref: "CreditCard",
      required: true,
    },
    paymentDate: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isSafeInteger,
    },
    note: { type: String, default: "", maxlength: 1000 },
  },
  { timestamps: true },
);

CardFeePaymentSchema.index({
  workspaceId: 1,
  userCardId: 1,
  paymentDate: -1,
  createdAt: -1,
});

export const CardFeePaymentModel = (mongoose.models.CardFeePayment ??
  mongoose.model(
    "CardFeePayment",
    CardFeePaymentSchema,
  )) as mongoose.Model<Record<string, unknown>>;
