import fs from "node:fs/promises";
import { validateCatalogProducts } from "../lib/cardCatalogCore.mjs";

const presetsPath = new URL("../data/card-presets.json", import.meta.url);
const manifestPath = new URL("../data/card-image-manifest.json", import.meta.url);

const readJson = async (url, fallback) => {
  try {
    return JSON.parse(await fs.readFile(url, "utf8"));
  } catch {
    return fallback;
  }
};

const products = await readJson(presetsPath, []);
const manifest = await readJson(manifestPath, {});
const issues = validateCatalogProducts(products, { manifest });

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(
      [
        `presetId=${issue.presetId}`,
        `field=${issue.field}`,
        `code=${issue.code}`,
        `message=${issue.message}`,
      ].join(" "),
    );
  }
  process.exit(1);
}

console.log(`Catalog validation passed for ${products.length} product(s).`);
