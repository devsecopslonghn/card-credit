import { Schema, model, models } from "mongoose";

const CardTransactionSchema = new Schema(
  {
    userId: { type: String, default: null },
    workspaceId: { type: String, required: true },
    userCardId: { type: Schema.Types.ObjectId, ref: "CreditCard", required: true },
    statementId: { type: Schema.Types.ObjectId, ref: "CardStatement", required: true },
    transactionDate: { type: String, required: true },
    outcomeAmount: { type: Number, required: true, min: 1 },
    incomeAmount: { type: Number, required: true, min: 0 },
    partnerReturnRateBps: { type: Number, required: true, min: 0, max: 10000 },
    incomeInputMode: { type: String, enum: ["AMOUNT", "RATE"], default: "AMOUNT" },
    cashbackRateBps: { type: Number, required: true, min: 0, max: 10000 },
    actualCashbackAmount: { type: Number, default: null, min: 0 },
    cashbackStatus: { type: String, enum: ["PENDING", "RECEIVED", "REJECTED"], default: "PENDING" },
    eligibleForAnnualFeeWaiver: { type: Boolean, default: true },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

CardTransactionSchema.index({ workspaceId: 1, transactionDate: -1 });
CardTransactionSchema.index({ workspaceId: 1, userCardId: 1, transactionDate: -1 });
CardTransactionSchema.index({ workspaceId: 1, statementId: 1 });
CardTransactionSchema.index({ workspaceId: 1, cashbackStatus: 1 });

const CardTransaction = models.CardTransaction || model("CardTransaction", CardTransactionSchema);
export default CardTransaction;
