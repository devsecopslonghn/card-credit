import mongoose, { Schema } from "mongoose";

const FinancialTransactionSchema = new Schema(
  {
    userId: { type: String, required: true },
    workspaceId: { type: String, required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    statementId: { type: Schema.Types.ObjectId, ref: "CardStatement", default: null },
    reimbursementForTransactionId: { type: Schema.Types.ObjectId, ref: "FinancialTransaction", default: null },
    accountType: { type: String, enum: ["DEBIT", "CASH", "E_WALLET", "CREDIT"], required: true },
    transactionType: {
      type: String,
      enum: ["EXPENSE", "TRANSFER", "REIMBURSEMENT", "REFUND", "CASHBACK", "INCOME", "STATEMENT_PAYMENT"],
      required: true,
    },
    ownership: { type: String, enum: ["PERSONAL", "PAID_FOR_OTHER"], default: "PERSONAL" },
    amount: { type: Number, required: true, min: 1 },
    reimbursementExpected: { type: Number, default: 0, min: 0 },
    serviceFeeRate: { type: Number, default: 0, min: 0, max: 100 },
    refundReceived: { type: Number, default: 0, min: 0 },
    cashbackReceived: { type: Number, default: 0, min: 0 },
    categoryId: { type: String, default: "OTHER" },
    transactionDate: { type: String, required: true },
    note: { type: String, default: "", maxlength: 1000 },
    // Calculated once by the domain service and retained for audit/reporting.
    personalSpending: { type: Number, required: true, min: 0 },
    debitCashflow: { type: Number, required: true },
    creditDebt: { type: Number, required: true },
    outstandingReceivable: { type: Number, required: true, min: 0 },
    reimbursementReceived: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

FinancialTransactionSchema.index({ workspaceId: 1, transactionDate: -1, createdAt: -1 });
FinancialTransactionSchema.index({ workspaceId: 1, accountId: 1, transactionDate: -1 });
FinancialTransactionSchema.index({ workspaceId: 1, categoryId: 1, transactionDate: -1 });
export const FinancialTransactionModel =
  (mongoose.models.FinancialTransaction ??
    mongoose.model("FinancialTransaction", FinancialTransactionSchema)) as mongoose.Model<
    Record<string, unknown>
  >;
