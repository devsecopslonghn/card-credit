import mongoose from "mongoose";
import { exactDuplicateCardGroups } from "../src/card-duplicate.js";

const uri = process.env.MONGODB_URI?.trim();
const apply = process.env.DATA_INTEGRITY_INDEX_APPLY === "true";
if (!uri) throw new Error("MONGODB_URI is required");

await mongoose.connect(uri);
try {
  const db = mongoose.connection.db!;
  const cards = db.collection("creditcards");
  const subscriptions = db.collection("calendarsubscriptions");
  const [cardIndexes, subscriptionIndexes, duplicateDevices, workspaceCards] = await Promise.all([
    cards.indexes().catch(() => []),
    subscriptions.indexes().catch(() => []),
    subscriptions.aggregate([
      { $match: { deviceLabel: { $type: "string" } } },
      { $group: { _id: { userId: "$userId", workspaceId: "$workspaceId", deviceLabel: "$deviceLabel" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "groups" },
    ]).toArray().catch(() => []),
    cards.find({}).project({ _id: 1, workspaceId: 1, presetId: 1, owner: 1, active: 1 }).toArray().catch(() => []),
  ]);
  const duplicateGroups = duplicateDevices[0]?.groups ?? 0;
  const duplicateCardGroups = exactDuplicateCardGroups(workspaceCards);
  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    cardIndexes: cardIndexes.map((index) => index.name),
    subscriptionIndexes: subscriptionIndexes.map((index) => index.name),
    duplicateDeviceGroups: duplicateGroups,
    duplicateCardGroups: duplicateCardGroups.length,
    duplicateCardIds: duplicateCardGroups.reduce((total, group) => total + group.cardIds.length, 0),
    required: ["credit_card_merge_redirect", "calendar_subscription_user_workspace_device_unique"],
  }));

  if (apply) {
    if (duplicateGroups > 0) throw new Error("Cannot apply calendar device uniqueness while duplicate device labels exist");
    await cards.createIndex({ workspaceId: 1, mergedIntoCardId: 1 }, { name: "credit_card_merge_redirect" });
    await subscriptions.createIndex(
      { userId: 1, workspaceId: 1, deviceLabel: 1 },
      { name: "calendar_subscription_user_workspace_device_unique", unique: true, partialFilterExpression: { deviceLabel: { $type: "string" } } },
    );
    const verified = new Set([
      ...(await cards.indexes()).map((index) => index.name),
      ...(await subscriptions.indexes()).map((index) => index.name),
    ]);
    const required = ["credit_card_merge_redirect", "calendar_subscription_user_workspace_device_unique"];
    const missing = required.filter((name) => !verified.has(name));
    if (missing.length) throw new Error(`Data integrity index verification failed: ${missing.join(",")}`);
    console.log(JSON.stringify({ applied: true, verified: required }));
  }
} finally {
  await mongoose.disconnect();
}
