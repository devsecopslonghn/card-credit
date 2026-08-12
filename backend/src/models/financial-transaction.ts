import mongoose, { Schema } from "mongoose";

const FinancialTransactionSchema = new Schema(
  {
    userId: { type: String, required: true },
    workspaceId: { type: String, required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    statementId: { type: Schema.Types.ObjectId, ref: "CardStatement", default: null },
    // Optional legacy link. Keep it absent for new transactions so the sparse
    // unique index does not treat multiple missing links as the same value.
    legacyTransactionId: { type: Schema.Types.ObjectId, ref: "CardTransaction" },
    accountType: { type: String, enum: ["DEBIT", "CASH", "E_WALLET", "CREDIT"], required: true },
    transactionType: {
      type: String,
      enum: ["EXPENSE", "TRANSFER", "REIMBURSEMENT", "REFUND", "CASHBACK", "INCOME", "STATEMENT_PAYMENT"],
      required: true,
    },
    ownership: { type: String, enum: ["PERSONAL", "PAID_FOR_OTHER"], default: "PERSONAL" },
    amount: { type: Number, required: true, min: 1 },
    reimbursementExpected: { type: Number, default: 0, min: 0 },
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
FinancialTransactionSchema.index(
  { workspaceId: 1, legacyTransactionId: 1 },
  {
    name: "financial_transaction_legacy_unique",
    unique: true,
    partialFilterExpression: { legacyTransactionId: { $type: "objectId" } },
  },
);

export const FinancialTransactionModel =
  (mongoose.models.FinancialTransaction ??
    mongoose.model("FinancialTransaction", FinancialTransactionSchema)) as mongoose.Model<
    Record<string, unknown>
  >;
