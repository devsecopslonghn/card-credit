import { readFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import type { Model } from "mongoose";
import { guardProductionImport, importCatalog } from "../src/catalog-import.js";
import { normalizeCatalogProduct, type CatalogProduct } from "../src/catalog.js";
import { CardProductModel } from "../src/models/card-product.js";

guardProductionImport(process.env);
const uri = process.env.MONGODB_URI?.trim(); if (!uri) throw new Error("MONGODB_URI is required");
const apply = process.argv.includes("--apply");
const baseline = path.resolve(process.cwd(), "../frontend/data/card-presets.json");
const products = (JSON.parse(await readFile(baseline, "utf8")) as Record<string, unknown>[]).map(normalizeCatalogProduct);
const model = CardProductModel as unknown as Model<CatalogProduct>;
await mongoose.connect(uri);
try {
  const summary = await importCatalog(products, {
    async findByPresetIds(ids) { return model.find({ presetId: { $in: ids } }).select("presetId providerCode providerName displayName network segment annualFee targetSpendForWaiver imageUrl benefits sourceUrl sourceCheckedAt active sortOrder theme -_id").lean<CatalogProduct[]>().exec(); },
    async upsert(product) { await model.updateOne({ presetId: product.presetId }, { $set: product }, { upsert: true, runValidators: true }); },
  }, apply);
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...summary }));
} finally { await mongoose.disconnect(); }
