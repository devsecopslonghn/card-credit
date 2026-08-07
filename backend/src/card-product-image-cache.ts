import crypto from "node:crypto";
import type { Model } from "mongoose";
import { CardProductImageModel } from "./models/card-product-image.js";
import type { CatalogProduct } from "./catalog.js";

type CardProductImage = { presetId: string; sourceUrl: string | null; contentType: string; data: Buffer; byteSize: number; sha256: string; status: "VERIFIED" | "BROKEN"; checkedAt: Date; errorMessage: string | null };
const imageModel = CardProductImageModel as unknown as Model<CardProductImage>;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

export const imageCacheStatus = async (presetIds: string[]) => {
  const rows = await imageModel.find({ presetId: { $in: presetIds } }).select("presetId sourceUrl contentType byteSize sha256 status checkedAt errorMessage -_id").lean();
  return new Map(rows.map((row) => [row.presetId, row]));
};

export const syncCardProductImage = async (product: CatalogProduct) => {
  const checkedAt = new Date();
  if (!product.imageUrl || !/^https?:\/\//i.test(product.imageUrl)) {
    return imageModel.findOneAndUpdate({ presetId: product.presetId }, { $set: { presetId: product.presetId, sourceUrl: product.imageUrl, status: "BROKEN", checkedAt, errorMessage: "imageUrl is missing or not http(s)" } }, { upsert: true, new: true, setDefaultsOnInsert: true }).select("presetId sourceUrl contentType byteSize sha256 status checkedAt errorMessage -_id").lean();
  }
  try {
    const response = await fetch(product.imageUrl, { signal: AbortSignal.timeout(15000), redirect: "follow" });
    if (!response.ok) throw new Error(`source returned HTTP ${response.status}`);
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase() ?? "";
    if (!allowedTypes.has(contentType)) throw new Error(`unsupported content-type ${contentType || "unknown"}`);
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_IMAGE_BYTES) throw new Error("image exceeds 5 MB limit");
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > MAX_IMAGE_BYTES) throw new Error("image exceeds 5 MB limit");
    const sha256 = crypto.createHash("sha256").update(data).digest("hex");
    return imageModel.findOneAndUpdate({ presetId: product.presetId }, { $set: { presetId: product.presetId, sourceUrl: product.imageUrl, contentType, data, byteSize: data.length, sha256, status: "VERIFIED", checkedAt, errorMessage: null } }, { upsert: true, new: true, setDefaultsOnInsert: true }).select("presetId sourceUrl contentType byteSize sha256 status checkedAt errorMessage -_id").lean();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.slice(0, 200) : "image sync failed";
    return imageModel.findOneAndUpdate({ presetId: product.presetId }, { $set: { presetId: product.presetId, sourceUrl: product.imageUrl, status: "BROKEN", checkedAt, errorMessage } }, { upsert: true, new: true, setDefaultsOnInsert: true }).select("presetId sourceUrl contentType byteSize sha256 status checkedAt errorMessage -_id").lean();
  }
};

export const getCachedCardProductImage = (presetId: string) => imageModel.findOne({ presetId, data: { $ne: null }, byteSize: { $gt: 0 } }).select("contentType data -_id").lean();
