import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Model } from "mongoose";
import { importCatalog, type ImportStore, type ImportSummary } from "./catalog-import.js";
import { normalizeCatalogProduct, type CatalogProduct } from "./catalog.js";
import { CardProductModel } from "./models/card-product.js";

const defaultCatalogPath = () => path.resolve(process.cwd(), "../frontend/data/card-presets.json");

export const catalogPath = (env: NodeJS.ProcessEnv = process.env) =>
  env.CARD_CATALOG_PATH?.trim() || defaultCatalogPath();

export const readCatalogFile = async (filePath = catalogPath()) => {
  const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  if (!Array.isArray(raw)) throw new Error("Card catalog baseline must be an array");
  return raw.map((entry) => normalizeCatalogProduct(entry as Record<string, unknown>));
};

const mongoStore = (model: Model<CatalogProduct> = CardProductModel as Model<CatalogProduct>): ImportStore => ({
  async findByPresetIds(ids) {
    return model.find({ presetId: { $in: ids } })
      .select("presetId providerCode providerName displayName network segment annualFee targetSpendForWaiver imageUrl benefits sourceUrl sourceCheckedAt active sortOrder theme -_id")
      .lean<CatalogProduct[]>()
      .exec();
  },
  async upsert(product) {
    await model.updateOne({ presetId: product.presetId }, { $set: product }, { upsert: true, runValidators: true });
  },
});

export const syncCatalogFromFile = async (filePath = catalogPath(), model?: Model<CatalogProduct>): Promise<ImportSummary> =>
  importCatalog(await readCatalogFile(filePath), mongoStore(model), true);
