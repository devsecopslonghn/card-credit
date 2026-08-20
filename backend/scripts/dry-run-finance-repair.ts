import mongoose from "mongoose";
import { loadConfig } from "../src/config.js";
import { AccountModel } from "../src/models/account.js";
import { FinancialTransactionModel } from "../src/models/financial-transaction.js";
import { CardStatementModel } from "../src/models/card-statement.js";
import { inspectFinanceRepair } from "../src/finance-repair.js";

const workspaceId = process.env.REPAIR_WORKSPACE_ID?.trim();
if (!workspaceId) throw new Error("REPAIR_WORKSPACE_ID is required; this command is read-only and has no default workspace.");
const config = loadConfig();
await mongoose.connect(config.mongodbUri);
try {
  const [accounts, transactions, statements] = await Promise.all([
    AccountModel.find({ workspaceId }).lean(),
    FinancialTransactionModel.find({ workspaceId }).lean(),
    CardStatementModel.find({ workspaceId }).lean(),
  ]);
  console.log(JSON.stringify({ mode: "DRY_RUN_READ_ONLY", workspaceId, report: inspectFinanceRepair(accounts, transactions, statements), rollback: "No writes performed; apply only through a separately reviewed preview/confirm migration." }, null, 2));
} finally { await mongoose.disconnect(); }
