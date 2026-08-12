import mongoose from "mongoose";
import { FinancialTransactionModel } from "../src/models/financial-transaction.js";

const uri = process.env.MONGODB_URI;
const apply = process.env.FINANCE_INDEX_APPLY === "true";
if (!uri) throw new Error("MONGODB_URI is required");

await mongoose.connect(uri);
try {
  const collection = FinancialTransactionModel.collection;
  const indexes = await collection.indexes();
  const legacyIndexes = indexes.filter((index) =>
    index.key?.workspaceId === 1 && index.key?.legacyTransactionId === 1,
  );
  const nullCount = await collection.countDocuments({ legacyTransactionId: null });
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", legacyIndexes, nullCount }));

  if (apply) {
    for (const index of legacyIndexes) if (index.name) await collection.dropIndex(index.name);
    if (nullCount > 0) {
      await collection.updateMany({ legacyTransactionId: null }, { $unset: { legacyTransactionId: "" } });
    }
    await collection.createIndex(
      { workspaceId: 1, legacyTransactionId: 1 },
      {
        name: "financial_transaction_legacy_unique",
        unique: true,
        partialFilterExpression: { legacyTransactionId: { $type: "objectId" } },
      },
    );
    console.log(JSON.stringify({ repaired: true, removedNullLinks: nullCount }));
  }
} finally {
  await mongoose.disconnect();
}
