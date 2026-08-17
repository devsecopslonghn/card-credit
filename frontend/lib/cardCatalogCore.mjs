export const CARD_IMAGE_PLACEHOLDER_URL = "/card-images/placeholder-card.svg";

export const ALLOWED_NETWORKS = new Set([
  "Visa",
  "Mastercard",
  "JCB",
  "American Express",
  "UnionPay",
  "Napas",
]);

const LEGACY_FIELD_MAP = {
  id: "presetId",
  bank: "providerCode",
  bankName: "providerName",
  name: "displayName",
  type: "network",
};

const DEFAULT_THEME = {
  background: "#111827",
  accent: "#475569",
};

export const sortCatalogProducts = (products) =>
  [...products].sort(
    (left, right) =>
      (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
      left.providerName.localeCompare(right.providerName) ||
      left.displayName.localeCompare(right.displayName),
  );

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isLocalImagePath = (value) => typeof value === "string" && value.startsWith("/card-images/");

const isValidImageValue = (value) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  (isHttpUrl(value) || isLocalImagePath(value) || value.startsWith("data:image/"));

export const getCatalogImageUrl = (product, manifest = {}) => {
  const manifestEntry = manifest[product.presetId] ?? manifest[product.id];
  if (typeof manifestEntry === "string" && manifestEntry) return manifestEntry;
  if (manifestEntry?.status === "cached" && manifestEntry.localPath) return manifestEntry.localPath;
  if (isValidImageValue(product.imageUrl)) return product.imageUrl;
  return CARD_IMAGE_PLACEHOLDER_URL;
};

export const createCatalogService = (rawProducts, manifest = {}) => {
  const products = sortCatalogProducts(rawProducts).map((product) =>
    Object.freeze({
      ...product,
      imageUrl: getCatalogImageUrl(product, manifest),
      theme: product.theme ?? DEFAULT_THEME,
    }),
  );

  const byPresetId = new Map(products.map((product) => [product.presetId, product]));

  const getAllCatalogProducts = () => products.map((product) => ({ ...product }));
  const getActiveCatalogProducts = () =>
    products.filter((product) => product.active).map((product) => ({ ...product }));
  const getPresetById = (presetId) => {
    const product = byPresetId.get(presetId);
    return product ? { ...product } : undefined;
  };
  const getProductsByProvider = (providerCode) =>
    products
      .filter((product) => product.active && product.providerCode === providerCode)
      .map((product) => ({ ...product }));
  const groupProductsByProvider = () => {
    const groups = new Map();

    for (const product of products.filter((item) => item.active)) {
      const group = groups.get(product.providerCode) ?? {
        providerCode: product.providerCode,
        providerName: product.providerName,
        products: [],
      };
      group.products.push({ ...product });
      groups.set(product.providerCode, group);
    }

    return [...groups.values()].sort((left, right) =>
      left.providerName.localeCompare(right.providerName) || left.providerCode.localeCompare(right.providerCode),
    );
  };
  const getCatalogProviders = () =>
    groupProductsByProvider().map(({ providerCode, providerName, products }) => ({
      providerCode,
      providerName,
      products,
    }));
  return {
    getAllCatalogProducts,
    getActiveCatalogProducts,
    getCatalogProviders,
    getProductsByProvider,
    getPresetById,
    groupProductsByProvider,
  };
};

const createIssue = (presetId, field, code, message) => ({ presetId, field, code, message });

export const validateCatalogProducts = (products, options = {}) => {
  const issues = [];
  const seenPresetIds = new Map();
  const seenSortOrders = new Map();
  const allowRemoteImage = options.allowRemoteImage !== false;

  products.forEach((product, index) => {
    const presetId = product.presetId ?? product.id ?? `index:${index}`;

    if (!product.presetId) {
      issues.push(createIssue(presetId, "presetId", "MISSING_PRESET_ID", "presetId is required."));
    } else {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.presetId)) {
        issues.push(createIssue(presetId, "presetId", "INVALID_PRESET_ID", "presetId must be lowercase kebab-case."));
      }
      const firstIndex = seenPresetIds.get(product.presetId);
      if (firstIndex !== undefined) {
        issues.push(
          createIssue(
            presetId,
            "presetId",
            "DUPLICATE_PRESET_ID",
            `Duplicate presetId also found at index ${firstIndex}.`,
          ),
        );
      } else {
        seenPresetIds.set(product.presetId, index);
      }
    }

    for (const [legacyField, canonicalField] of Object.entries(LEGACY_FIELD_MAP)) {
      if (product[legacyField] !== undefined && product[legacyField] !== product[canonicalField]) {
        issues.push(
          createIssue(
            presetId,
            legacyField,
            "LEGACY_ALIAS_MISMATCH",
            `${legacyField} must match canonical field ${canonicalField}.`,
          ),
        );
      }
    }

    if (!product.providerCode) {
      issues.push(createIssue(presetId, "providerCode", "MISSING_PROVIDER_CODE", "providerCode is required."));
    } else if (!/^[A-Z0-9]+$/.test(product.providerCode)) {
      issues.push(createIssue(presetId, "providerCode", "INVALID_PROVIDER_CODE", "providerCode must be uppercase."));
    }

    if (!product.providerName) {
      issues.push(createIssue(presetId, "providerName", "MISSING_PROVIDER_NAME", "providerName is required."));
    }

    if (!product.displayName) {
      issues.push(createIssue(presetId, "displayName", "MISSING_DISPLAY_NAME", "displayName is required."));
    }

    if (!ALLOWED_NETWORKS.has(product.network)) {
      issues.push(createIssue(presetId, "network", "INVALID_NETWORK", `Unsupported network: ${product.network}.`));
    }

    if (product.annualFee !== null && typeof product.annualFee !== "number") {
      issues.push(createIssue(presetId, "annualFee", "INVALID_ANNUAL_FEE_TYPE", "annualFee must be number or null."));
    } else if (typeof product.annualFee === "number" && product.annualFee < 0) {
      issues.push(createIssue(presetId, "annualFee", "NEGATIVE_ANNUAL_FEE", "annualFee must not be negative."));
    }

    if (typeof product.active !== "boolean") {
      issues.push(createIssue(presetId, "active", "INVALID_ACTIVE", "active must be boolean."));
    }

    if (typeof product.sortOrder !== "number" || !Number.isFinite(product.sortOrder)) {
      issues.push(createIssue(presetId, "sortOrder", "INVALID_SORT_ORDER", "sortOrder must be a finite number."));
    } else {
      const firstPreset = seenSortOrders.get(product.sortOrder);
      if (firstPreset) {
        issues.push(
          createIssue(
            presetId,
            "sortOrder",
            "DUPLICATE_SORT_ORDER",
            `sortOrder is already used by ${firstPreset}.`,
          ),
        );
      } else {
        seenSortOrders.set(product.sortOrder, presetId);
      }
    }

    if (product.sourceUrl && !isHttpUrl(product.sourceUrl)) {
      issues.push(createIssue(presetId, "sourceUrl", "INVALID_SOURCE_URL", "sourceUrl must be an http(s) URL."));
    }

    if (product.active && !product.sourceUrl) {
      issues.push(createIssue(presetId, "sourceUrl", "MISSING_SOURCE_URL", "Active products require sourceUrl."));
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(product.sourceCheckedAt ?? "")) {
      issues.push(
        createIssue(presetId, "sourceCheckedAt", "INVALID_SOURCE_CHECKED_AT", "sourceCheckedAt must be YYYY-MM-DD."),
      );
    }

    if (product.imageUrl !== null && product.imageUrl !== undefined && product.imageUrl !== "") {
      const imageIsAllowed =
        isLocalImagePath(product.imageUrl) || product.imageUrl.startsWith("data:image/") || isHttpUrl(product.imageUrl);
      if (!imageIsAllowed) {
        issues.push(createIssue(presetId, "imageUrl", "INVALID_IMAGE_URL", "imageUrl must be http(s), local, or null."));
      }
      if (!allowRemoteImage && isHttpUrl(product.imageUrl)) {
        issues.push(createIssue(presetId, "imageUrl", "REMOTE_IMAGE_NOT_ALLOWED", "Remote image URL is not allowed."));
      }
    }

    if (product.active && !isValidImageValue(getCatalogImageUrl(product, options.manifest ?? {}))) {
      issues.push(createIssue(presetId, "imageUrl", "MISSING_IMAGE_FALLBACK", "Active products require image fallback."));
    }

    if (product.presetId === "sacombank-jcb-ultimate" && /amex|american/i.test(product.imageUrl ?? "")) {
      issues.push(
        createIssue(
          presetId,
          "imageUrl",
          "SUSPICIOUS_IMAGE_MAPPING",
          "JCB Ultimate image must not point to American Express assets.",
        ),
      );
    }
  });

  return issues;
};
