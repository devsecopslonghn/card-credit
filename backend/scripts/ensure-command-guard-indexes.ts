import mongoose from "mongoose";

const uri = process.env.MONGODB_URI?.trim();
const apply = process.env.COMMAND_GUARD_INDEX_APPLY === "true";
if (!uri) throw new Error("MONGODB_URI is required");

await mongoose.connect(uri);
try {
  const db = mongoose.connection.db!;
  const receipts = db.collection("commandreceipts");
  const audits = db.collection("commandaudits");
  const [receiptIndexes, auditIndexes, duplicateReceipts] = await Promise.all([
    receipts.indexes().catch(() => []),
    audits.indexes().catch(() => []),
    receipts.aggregate([
      { $group: { _id: { workspaceId: "$workspaceId", operation: "$operation", idempotencyKey: "$idempotencyKey" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "groups" },
    ]).toArray().catch(() => []),
  ]);
  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    collections: { commandreceipts: await db.listCollections({ name: "commandreceipts" }).hasNext(), commandaudits: await db.listCollections({ name: "commandaudits" }).hasNext() },
    receiptIndexes: receiptIndexes.map((index) => index.name),
    auditIndexes: auditIndexes.map((index) => index.name),
    duplicateReceiptGroups: duplicateReceipts[0]?.groups ?? 0,
  }));
  if (apply) {
    if ((duplicateReceipts[0]?.groups ?? 0) > 0) throw new Error("Cannot apply command receipt indexes while duplicate keys exist");
    await receipts.createIndex({ workspaceId: 1, operation: 1, idempotencyKey: 1 }, { name: "command_receipt_unique", unique: true });
    await receipts.createIndex({ workspaceId: 1, createdAt: -1 }, { name: "command_receipt_workspace_created" });
    await audits.createIndex({ workspaceId: 1, createdAt: -1 }, { name: "command_audit_workspace_created" });
    await audits.createIndex({ workspaceId: 1, operation: 1, createdAt: -1 }, { name: "command_audit_workspace_operation_created" });
    console.log(JSON.stringify({ applied: true }));
  }
} finally {
  await mongoose.disconnect();
}
