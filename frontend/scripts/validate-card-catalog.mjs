import { validateCatalogProducts } from "../lib/cardCatalogCore.mjs";
import { readCatalogJson } from "../lib/catalogValidation.mjs";
import { logError, logInfo } from "../lib/observability/logger.mjs";

const presetsPath = new URL("../data/card-presets.json", import.meta.url);
const manifestPath = new URL("../data/card-image-manifest.json", import.meta.url);

const products = await readCatalogJson(presetsPath);
const manifest = await readCatalogJson(manifestPath, {});
const issues = validateCatalogProducts(products, { manifest });

if (issues.length > 0) {
  logError("CATALOG_VALIDATION_FAILURE", {
    issues: issues.length,
    presets: products.length,
  });
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

logInfo("CATALOG_VALIDATION_SUCCESS", {
  products: products.length,
});
console.log(`Catalog validation passed for ${products.length} product(s).`);
