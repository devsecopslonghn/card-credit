import rawCardPresets from "../../data/card-presets.json" with { type: "json" };
import cardImageManifest from "../../data/card-image-manifest.json" with { type: "json" };
import { createCatalogService } from "../cardCatalogCore.mjs";

const catalogService = createCatalogService(rawCardPresets, cardImageManifest);

class CatalogApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const apiError = (status, code, message, fields) => new CatalogApiError(status, code, message, fields);

const stripLegacyAliases = (product) => {
  const { id, bank, bankName, name, type, ...catalogProduct } = product;
  return catalogProduct;
};

const normalizeProviderCode = (providerCode) => providerCode.trim().toUpperCase();

export const getCatalogProvidersResponse = () => ({
  data: catalogService.getCatalogProviders().map((provider) => ({
    providerCode: provider.providerCode,
    providerName: provider.providerName,
    products: provider.products.map(stripLegacyAliases),
  })),
});

export const getCatalogProductsResponse = (providerCode) => {
  if (providerCode === undefined || providerCode === null || providerCode === "") {
    return { data: catalogService.getActiveCatalogProducts().map(stripLegacyAliases) };
  }

  const normalizedProviderCode = normalizeProviderCode(providerCode);
  const products = catalogService.getProductsByProvider(normalizedProviderCode);

  if (products.length === 0) {
    throw apiError(404, "PROVIDER_NOT_FOUND", "Không tìm thấy provider đang hoạt động.", {
      provider: normalizedProviderCode,
    });
  }

  return { data: products.map(stripLegacyAliases) };
};

export const getCatalogProductDetailResponse = (presetId) => {
  const product = catalogService.getPresetById(presetId);

  if (!product || !product.active) {
    throw apiError(404, "PRESET_NOT_FOUND", "Không tìm thấy Card Product.");
  }

  return { data: stripLegacyAliases(product) };
};
