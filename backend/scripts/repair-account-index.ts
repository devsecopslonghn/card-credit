import mongoose from "mongoose";
import { AccountModel } from "../src/models/account.js";

const uri = process.env.MONGODB_URI;
const apply = process.env.ACCOUNT_INDEX_APPLY === "true";
if (!uri) throw new Error("MONGODB_URI is required");

await mongoose.connect(uri);
try {
  const collection = AccountModel.collection;
  const indexes = await collection.indexes();
  const accountIndexes = indexes.filter((index) => index.key?.workspaceId === 1 && index.key?.creditCardId === 1);
  const nullCount = await collection.countDocuments({ creditCardId: null });
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", accountIndexes, nullCount }));
  if (apply) {
    for (const index of accountIndexes) if (index.name) await collection.dropIndex(index.name);
    if (nullCount > 0) await collection.updateMany({ creditCardId: null }, { $unset: { creditCardId: "" } });
    await collection.createIndex(
      { workspaceId: 1, creditCardId: 1 },
      { name: "account_credit_card_unique", unique: true, partialFilterExpression: { creditCardId: { $type: "objectId" } } },
    );
    console.log(JSON.stringify({ repaired: true, removedNullLinks: nullCount }));
  }
} finally {
  await mongoose.disconnect();
}
