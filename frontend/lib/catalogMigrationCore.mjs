const CATALOG_VERSION = "json-v1";

const PROVIDER_ALIAS_MAP = new Map([
  ["vietcombank", "vcb"],
  ["ngan hang vietcombank", "vcb"],
  ["ngan hang tmcp ngoai thuong viet nam", "vcb"],
  ["techcombank", "tcb"],
  ["ngan hang techcombank", "tcb"],
  ["ngan hang tmcp ky thuong viet nam", "tcb"],
  ["sacombank", "stb"],
  ["ngan hang sacombank", "stb"],
  ["ngan hang tmcp sai gon thuong tin", "stb"],
  ["vpbank", "vpb"],
  ["mbbank", "mbb"],
  ["mb bank", "mbb"],
  ["mb", "mbb"],
]);

const NETWORK_ALIAS_MAP = new Map([
  ["master card", "mastercard"],
  ["mc", "mastercard"],
  ["amex", "american express"],
  ["americanexpress", "american express"],
]);

const PRODUCT_STOP_WORDS = new Set([
  "card",
  "credit",
  "the",
  "tin",
  "dung",
  "platinum",
  "signature",
]);

const toPlainObject = (card) => {
  if (card && typeof card === "object" && typeof card.toObject === "function") return card.toObject();
  return { ...card };
};

const compact = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

export const normalizeMatchText = (value) => {
  const text = compact(value);
  if (!text) return "";

  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[®™©]/g, "")
    .replace(/&/g, " and ")
    .replace(/[_/\\|+.,:;()[\]{}'"`~!?-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const normalizeProvider = (value) => {
  const normalized = normalizeMatchText(value);
  return PROVIDER_ALIAS_MAP.get(normalized) ?? normalized;
};

const normalizeNetwork = (value) => {
  const normalized = normalizeMatchText(value);
  return NETWORK_ALIAS_MAP.get(normalized) ?? normalized;
};

const productTokens = (value) =>
  normalizeMatchText(value)
    .split(" ")
    .filter((token) => token && !PRODUCT_STOP_WORDS.has(token));

const productTokenKey = (value) => productTokens(value).join(" ");

const uniqueValues = (values) => [...new Set(values.map(normalizeMatchText).filter(Boolean))];

const uniqueProviderValues = (values) => [...new Set(values.map(normalizeProvider).filter(Boolean))];

const uniqueNetworkValues = (values) => [...new Set(values.map(normalizeNetwork).filter(Boolean))];

const productIdentity = (product) => ({
  providers: uniqueProviderValues([product.providerCode, product.providerName, product.bank, product.bankName]),
  names: uniqueValues([product.displayName, product.name]),
  networks: uniqueNetworkValues([product.network, product.type]),
  productTokenKey: productTokenKey(product.displayName ?? product.name),
});

const cardIdentity = (card) => ({
  providers: uniqueProviderValues([card.providerCode, card.providerName, card.bank, card.bankName]),
  names: uniqueValues([card.displayName, card.name]),
  networks: uniqueNetworkValues([card.network, card.type]),
  productTokenKey: productTokenKey(card.displayName ?? card.name),
});

const intersects = (left, right) => left.some((value) => right.includes(value));

const exactIdentityMatch = (cardInfo, productInfo) =>
  intersects(cardInfo.providers, productInfo.providers) &&
  intersects(cardInfo.names, productInfo.names) &&
  intersects(cardInfo.networks, productInfo.networks);

const probableIdentityMatch = (cardInfo, productInfo) => {
  if (!intersects(cardInfo.providers, productInfo.providers) || !intersects(cardInfo.networks, productInfo.networks)) {
    return false;
  }

  if (!cardInfo.productTokenKey || !productInfo.productTokenKey) return false;
  if (cardInfo.productTokenKey === productInfo.productTokenKey) return true;

  const cardTokens = productTokens(cardInfo.productTokenKey);
  const productTokenSet = new Set(productTokens(productInfo.productTokenKey));
  const overlap = cardTokens.filter((token) => productTokenSet.has(token));

  return overlap.length >= 2 && overlap.length === Math.min(cardTokens.length, productTokenSet.size);
};

const matchReason = (status, matches) => {
  if (status === "already-migrated") return "Card already has presetId; skipped.";
  if (status === "exact") return "Provider, product name and network match one catalog preset.";
  if (status === "probable") return "Provider and network match; normalized product tokens are close and require review.";
  if (status === "ambiguous") return `Multiple catalog presets matched: ${matches.map((item) => item.presetId).join(", ")}.`;
  return "No catalog preset matched provider, product name and network.";
};

export const buildCatalogMigrationUpdate = (product) => ({
  presetId: product.presetId,
  providerCode: product.providerCode,
  providerName: product.providerName,
  displayName: product.displayName,
  network: product.network,
  catalogVersion: product.catalogVersion ?? CATALOG_VERSION,
  legacy: false,
});

export const classifyCatalogMatch = (cardInput, products) => {
  const card = toPlainObject(cardInput);
  if (card.presetId) {
    return {
      status: "already-migrated",
      matchedPresetId: card.presetId,
      matches: [],
      reason: matchReason("already-migrated", []),
    };
  }

  const cardInfo = cardIdentity(card);
  const productInfos = products.map((product) => ({ product, info: productIdentity(product) }));
  const exactMatches = productInfos
    .filter(({ info }) => exactIdentityMatch(cardInfo, info))
    .map(({ product }) => product);

  if (exactMatches.length === 1) {
    return {
      status: "exact",
      matchedPresetId: exactMatches[0].presetId,
      matchedProduct: exactMatches[0],
      matches: exactMatches,
      reason: matchReason("exact", exactMatches),
      update: buildCatalogMigrationUpdate(exactMatches[0]),
    };
  }

  if (exactMatches.length > 1) {
    return {
      status: "ambiguous",
      matchedPresetId: null,
      matches: exactMatches,
      reason: matchReason("ambiguous", exactMatches),
    };
  }

  const probableMatches = productInfos
    .filter(({ info }) => probableIdentityMatch(cardInfo, info))
    .map(({ product }) => product);

  if (probableMatches.length === 1) {
    return {
      status: "probable",
      matchedPresetId: probableMatches[0].presetId,
      matchedProduct: probableMatches[0],
      matches: probableMatches,
      reason: matchReason("probable", probableMatches),
    };
  }

  if (probableMatches.length > 1) {
    return {
      status: "ambiguous",
      matchedPresetId: null,
      matches: probableMatches,
      reason: matchReason("ambiguous", probableMatches),
    };
  }

  return {
    status: "unmatched",
    matchedPresetId: null,
    matches: [],
    reason: matchReason("unmatched", []),
  };
};

export const buildCatalogMigrationReport = (cards, products) => {
  const details = cards.map((input) => {
    const card = toPlainObject(input);
    const match = classifyCatalogMatch(card, products);
    return {
      cardId: String(card._id ?? card.id ?? ""),
      current: {
        bank: card.bank ?? null,
        name: card.name ?? null,
        type: card.type ?? null,
      },
      status: match.status,
      matchedPresetId: match.matchedPresetId ?? null,
      reason: match.reason,
      update: match.update,
    };
  });

  const countStatus = (status) => details.filter((detail) => detail.status === status).length;
  const summary = {
    total: details.length,
    exact: countStatus("exact"),
    probable: countStatus("probable"),
    ambiguous: countStatus("ambiguous"),
    unmatched: countStatus("unmatched"),
    alreadyMigrated: countStatus("already-migrated"),
    wouldUpdate: countStatus("exact"),
  };

  return { summary, details };
};

export const runCatalogMigration = async ({ cards, products, apply = false, updateCard } = {}) => {
  const report = buildCatalogMigrationReport(cards ?? [], products ?? []);
  const applied = { matched: 0, modified: 0 };

  if (!apply) return { ...report, applied };
  if (typeof updateCard !== "function") throw new Error("updateCard is required in apply mode.");

  for (const detail of report.details) {
    if (detail.status !== "exact" || !detail.update) continue;
    const result = await updateCard(detail.cardId, detail.update);
    applied.matched += result?.matched ?? 0;
    applied.modified += result?.modified ?? 0;
  }

  return { ...report, applied };
};
