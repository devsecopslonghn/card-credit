export const CARD_IMAGE_PLACEHOLDER_URL = "/card-images/placeholder-card.svg";
export const MAX_OWNER_LENGTH = 120;

export const normalizeOwnerInput = (owner) =>
  typeof owner === "string" ? owner.trim().replace(/\s+/g, " ") : "";

export const validateOwnerInput = (owner) => {
  const normalized = normalizeOwnerInput(owner);

  if (!normalized) {
    return {
      valid: false,
      owner: normalized,
      message: "Vui lòng nhập chủ thẻ.",
    };
  }

  if (normalized.length > MAX_OWNER_LENGTH) {
    return {
      valid: false,
      owner: normalized,
      message: `Chủ thẻ không được vượt quá ${MAX_OWNER_LENGTH} ký tự.`,
    };
  }

  return { valid: true, owner: normalized, message: "" };
};

export const buildCreateCardPayload = (presetId, owner) => ({
  presetId,
  owner: normalizeOwnerInput(owner),
});

export const formatVnd = (value) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(0);
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

export const formatAnnualFee = (value) => {
  if (value === null || value === undefined || value === "") return "Chưa xác định";
  return formatVnd(value);
};

export const formatDateDisplay = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return "Chưa thiết lập";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return "Chưa thiết lập";
  return `${day}/${month}/${year}`;
};

export const getProviderName = (card) => {
  const providerName = card?.providerName ?? card?.bank;
  return typeof providerName === "string" && providerName.trim() ? providerName.trim() : "Không xác định";
};

export const getProviderKey = (card) => {
  const key = card?.providerCode ?? card?.bank;
  const normalized = typeof key === "string" ? key.trim().toUpperCase() : "";
  return normalized || "UNKNOWN";
};

export const getDisplayName = (card) => {
  const displayName = card?.displayName ?? card?.name;
  return typeof displayName === "string" && displayName.trim() ? displayName.trim() : "Thẻ chưa xác định";
};

export const getNetwork = (card) => {
  const network = card?.network ?? card?.type;
  return typeof network === "string" && network.trim() ? network.trim() : "Không xác định";
};

export const isLegacyCard = (card) => card?.legacy ?? !card?.presetId;

export const compareCards = (left, right) =>
  getDisplayName(left).localeCompare(getDisplayName(right), "vi") ||
  getNetwork(left).localeCompare(getNetwork(right), "vi") ||
  String(left?._id ?? "").localeCompare(String(right?._id ?? ""));

export const groupCardsByProvider = (cards) => {
  const groups = new Map();

  for (const card of cards) {
    const providerKey = getProviderKey(card);
    const providerName = getProviderName(card);
    const group = groups.get(providerKey) ?? {
      providerKey,
      providerName,
      cards: [],
    };

    if (providerName !== "Không xác định" && group.providerName === "Không xác định") {
      group.providerName = providerName;
    }

    group.cards.push(card);
    groups.set(providerKey, group);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, cards: [...group.cards].sort(compareCards) }))
    .sort(
      (left, right) =>
        left.providerName.localeCompare(right.providerName, "vi") ||
        left.providerKey.localeCompare(right.providerKey, "vi"),
    );
};

export const getUniqueOwners = (cards) =>
  [...new Set(cards.map((card) => normalizeOwnerInput(card?.owner)).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "vi"),
  );

export const filterCardsByOwner = (cards, owner) => {
  const normalizedOwner = normalizeOwnerInput(owner);
  if (!normalizedOwner) return cards;
  return cards.filter((card) => normalizeOwnerInput(card?.owner) === normalizedOwner);
};

export const getUpcomingPayments = (cards) =>
  cards
    .filter((card) => card?.paymentDueDate && !card?.isPaidThisMonth)
    .sort((left, right) => String(left.paymentDueDate).localeCompare(String(right.paymentDueDate)));

export const defaultMonthlyData = () =>
  Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    spend: 0,
    cashback: 0,
    fee: 0,
    otherInterest: 0,
  }));

export const getMonthlyData = (card) => (Array.isArray(card?.monthlyData) ? card.monthlyData : defaultMonthlyData());

export const numberOrZero = (value) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

export const getAnnualFeeForCalculation = (annualFee) =>
  typeof annualFee === "number" && Number.isFinite(annualFee) ? annualFee : 0;

export const calculateCardMetrics = (card) => {
  const monthlyData = getMonthlyData(card);
  const totalSpend = monthlyData.reduce((sum, month) => sum + numberOrZero(month?.spend), 0);
  const totalCashback = monthlyData.reduce((sum, month) => sum + numberOrZero(month?.cashback), 0);
  const totalFee = monthlyData.reduce((sum, month) => sum + numberOrZero(month?.fee), 0);
  const totalOtherInterest = monthlyData.reduce((sum, month) => sum + numberOrZero(month?.otherInterest), 0);
  const targetSpendForWaiver = numberOrZero(card?.targetSpendForWaiver);
  const annualFeeForCalculation = getAnnualFeeForCalculation(card?.annualFee);
  const annualFeeKnown = typeof card?.annualFee === "number" && Number.isFinite(card.annualFee);
  const isWaved = targetSpendForWaiver > 0 && totalSpend >= targetSpendForWaiver;
  const annualFeeApplied = isWaved ? 0 : annualFeeForCalculation;
  const remainingSpend = targetSpendForWaiver > totalSpend ? targetSpendForWaiver - totalSpend : 0;
  const netProfit = totalCashback + totalOtherInterest - totalFee - annualFeeApplied;

  return {
    monthlyData,
    totalSpend,
    totalCashback,
    totalFee,
    totalOtherInterest,
    targetSpendForWaiver,
    annualFeeKnown,
    annualFeeForCalculation,
    annualFeeApplied,
    remainingSpend,
    isWaved,
    netProfit,
  };
};

export const calculateMonthNet = (month) =>
  numberOrZero(month?.cashback) + numberOrZero(month?.otherInterest) - numberOrZero(month?.fee);

export const buildOperationalUpdatePayload = (input) => {
  const payload = {};
  if ("owner" in input) payload.owner = normalizeOwnerInput(input.owner);
  if ("targetSpendForWaiver" in input) payload.targetSpendForWaiver = numberOrZero(input.targetSpendForWaiver);
  if ("statementDate" in input) payload.statementDate = typeof input.statementDate === "string" ? input.statementDate : "";
  if ("paymentDueDate" in input) payload.paymentDueDate = typeof input.paymentDueDate === "string" ? input.paymentDueDate : "";
  if ("amountDueThisMonth" in input) payload.amountDueThisMonth = numberOrZero(input.amountDueThisMonth);
  if ("isPaidThisMonth" in input) payload.isPaidThisMonth = Boolean(input.isPaidThisMonth);
  if ("monthlyData" in input) payload.monthlyData = Array.isArray(input.monthlyData) ? input.monthlyData : defaultMonthlyData();
  return payload;
};
