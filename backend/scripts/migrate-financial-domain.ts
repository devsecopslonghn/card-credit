import mongoose from "mongoose";
import { AccountModel } from "../src/models/account.js";
import { CreditCardModel } from "../src/models/credit-card.js";
import { CardTransactionModel } from "../src/models/card-transaction.js";
import { FinancialTransactionModel } from "../src/models/financial-transaction.js";
import { calculateFinancialImpact } from "../src/financial-domain.js";

const uri = process.env.MONGODB_URI?.trim();
if (!uri) throw new Error("MONGODB_URI is required");
const apply = process.argv.includes("--apply");
const workspaceId = process.env.FINANCE_MIGRATION_WORKSPACE_ID?.trim();
if (!workspaceId) throw new Error("FINANCE_MIGRATION_WORKSPACE_ID is required");
if (apply && process.env.CONFIRM_FINANCE_MIGRATION !== "YES") throw new Error("--apply requires CONFIRM_FINANCE_MIGRATION=YES");
await mongoose.connect(uri);
try {
  const cards = await CreditCardModel.find({ workspaceId }).lean();
  let accounts = 0;
  let transactions = 0;
  for (const card of cards) {
    const accountData = { userId: String(card.userId ?? ""), workspaceId: String(card.workspaceId), name: `Credit: ${String(card.displayName ?? card.name)}`, type: "CREDIT", creditCardId: card._id, openingBalance: 0 };
    let account = await AccountModel.findOne({ workspaceId: accountData.workspaceId, creditCardId: card._id }).lean();
    if (!account) {
      accounts += 1;
      if (apply) account = await AccountModel.findOneAndUpdate({ workspaceId: accountData.workspaceId, creditCardId: card._id }, { $setOnInsert: accountData }, { upsert: true, returnDocument: "after" }).lean();
    }
    const items = await CardTransactionModel.find({ workspaceId: card.workspaceId, userCardId: card._id }).lean();
    transactions += items.length;
    if (!apply || !account) continue;
    for (const item of items) {
      const impact = calculateFinancialImpact({ accountType: "CREDIT", amount: Number(item.outcomeAmount), ownership: Number(item.incomeAmount ?? 0) > 0 ? "PAID_FOR_OTHER" : "PERSONAL", reimbursementExpected: Number(item.incomeAmount ?? 0) });
      await FinancialTransactionModel.updateOne({ workspaceId: String(card.workspaceId), legacyTransactionId: item._id }, { $setOnInsert: { userId: String(card.userId ?? ""), workspaceId: String(card.workspaceId), accountId: account._id, statementId: item.statementId, legacyTransactionId: item._id, accountType: "CREDIT", transactionType: "EXPENSE", ownership: Number(item.incomeAmount ?? 0) > 0 ? "PAID_FOR_OTHER" : "PERSONAL", amount: Number(item.outcomeAmount), reimbursementExpected: Number(item.incomeAmount ?? 0), refundReceived: 0, cashbackReceived: Number(item.actualCashbackAmount ?? 0), categoryId: "OTHER", transactionDate: String(item.transactionDate), note: String(item.note ?? ""), ...impact } }, { upsert: true });
    }
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", workspaceId, cards: cards.length, accounts, transactions }));
} finally { await mongoose.disconnect(); }
