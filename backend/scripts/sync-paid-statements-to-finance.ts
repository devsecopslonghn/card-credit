import mongoose from "mongoose";
import { AccountModel } from "../src/models/account.js";
import { CardStatementModel } from "../src/models/card-statement.js";
import { FinancialTransactionModel } from "../src/models/financial-transaction.js";
import { calculateFinancialImpact } from "../src/financial-domain.js";

const uri = process.env.MONGODB_URI?.trim();
const workspaceId = process.env.FINANCE_MIGRATION_WORKSPACE_ID?.trim();
const repaymentAccountId = process.env.FINANCE_REPAYMENT_ACCOUNT_ID?.trim();
const apply = process.env.FINANCE_SYNC_APPLY === "true";
if (!uri) throw new Error("MONGODB_URI is required");
if (!workspaceId) throw new Error("FINANCE_MIGRATION_WORKSPACE_ID is required");
if (apply && !repaymentAccountId) throw new Error("FINANCE_REPAYMENT_ACCOUNT_ID is required when applying");

await mongoose.connect(uri);
try {
  const account = repaymentAccountId
    ? await AccountModel.findOne({ _id: repaymentAccountId, workspaceId, type: { $in: ["DEBIT", "CASH", "E_WALLET"] }, active: { $ne: false } }).lean()
    : null;
  if (apply && !account) throw new Error("Repayment account not found or is not REAL_MONEY");
  const statements = await CardStatementModel.find({ workspaceId, paymentStatus: "PAID", paidAmount: { $gt: 0 } }).sort({ paidAt: 1, paymentDueDate: 1 }).lean();
  const rows = [];
  for (const statement of statements) {
    const existing = await FinancialTransactionModel.findOne({ workspaceId, statementId: statement._id, transactionType: "STATEMENT_PAYMENT" }).lean();
    const amount = Number(statement.paidAmount ?? 0);
    rows.push({ statementId: String(statement._id), amount, paidAt: statement.paidAt ?? null, existing: Boolean(existing) });
    if (!apply || existing) continue;
    const impact = calculateFinancialImpact({ accountType: String(account!.type) as "DEBIT" | "CASH" | "E_WALLET", transactionType: "STATEMENT_PAYMENT", amount });
    const paidAt = statement.paidAt ? new Date(String(statement.paidAt)).toISOString().slice(0, 10) : String(statement.paymentDueDate);
    await FinancialTransactionModel.create({ userId: String(statement.userId ?? ""), workspaceId, accountId: account!._id, statementId: statement._id, accountType: account!.type, transactionType: "STATEMENT_PAYMENT", ownership: "PERSONAL", amount, reimbursementExpected: 0, refundReceived: 0, cashbackReceived: 0, categoryId: "CREDIT_REPAYMENT", transactionDate: paidAt, note: `Đồng bộ tất toán sao kê ${String(statement._id)}`, ...impact });
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", workspaceId, repaymentAccountId: account?._id ? String(account._id) : null, statements: rows.length, alreadySynced: rows.filter((row) => row.existing).length, pending: rows.filter((row) => !row.existing).length, rows }));
} finally { await mongoose.disconnect(); }
