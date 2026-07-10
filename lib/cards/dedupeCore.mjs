const DUPLICATE_FIELDS = ["spend", "cashback", "fee", "otherInterest"];

export const normalizeDuplicateOwner = (owner) =>
  typeof owner === "string" ? owner.trim().replace(/\s+/g, " ") : "";

const cardId = (card) => card?._id?.toString?.() ?? card?.id?.toString?.() ?? card?._id ?? card?.id ?? "";

export const duplicateFingerprintForCard = (card) => {
  const workspaceId = typeof card?.workspaceId === "string" && card.workspaceId ? card.workspaceId : null;
  const presetId = typeof card?.presetId === "string" && card.presetId ? card.presetId : null;
  const normalizedOwner = normalizeDuplicateOwner(card?.owner);

  if (!workspaceId || !presetId || !normalizedOwner) return null;
  return {
    key: `${workspaceId}::${presetId}::${normalizedOwner}`,
    workspaceId,
    presetId,
    normalizedOwner,
  };
};

const compareCards = (left, right) => {
  const leftCreated = new Date(left?.createdAt ?? 0).getTime();
  const rightCreated = new Date(right?.createdAt ?? 0).getTime();
  if (leftCreated !== rightCreated) return leftCreated - rightCreated;
  return String(cardId(left)).localeCompare(String(cardId(right)));
};

export const findDuplicateCardGroups = (cards = []) => {
  const groups = new Map();

  for (const card of cards) {
    const fingerprint = duplicateFingerprintForCard(card);
    if (!fingerprint) continue;
    const group = groups.get(fingerprint.key) ?? {
      fingerprint: fingerprint.key,
      workspaceId: fingerprint.workspaceId,
      presetId: fingerprint.presetId,
      normalizedOwner: fingerprint.normalizedOwner,
      reason: "Same workspace, catalog preset and normalized owner.",
      cards: [],
    };
    group.cards.push(card);
    groups.set(fingerprint.key, group);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, cards: [...group.cards].sort(compareCards) }))
    .filter((group) => group.cards.length > 1)
    .sort((left, right) => left.fingerprint.localeCompare(right.fingerprint));
};

const monthKey = (month) => Number(month?.month);

export const mergeMonthlyDataBySum = (targetMonthlyData = [], sourceMonthlyData = []) => {
  const months = new Map();

  for (const month of targetMonthlyData) {
    const key = monthKey(month);
    if (!Number.isInteger(key) || key < 1 || key > 12) continue;
    months.set(key, {
      month: key,
      spend: Number(month.spend) || 0,
      cashback: Number(month.cashback) || 0,
      fee: Number(month.fee) || 0,
      otherInterest: Number(month.otherInterest) || 0,
    });
  }

  for (const month of sourceMonthlyData) {
    const key = monthKey(month);
    if (!Number.isInteger(key) || key < 1 || key > 12) continue;
    const current = months.get(key) ?? { month: key, spend: 0, cashback: 0, fee: 0, otherInterest: 0 };
    for (const field of DUPLICATE_FIELDS) {
      current[field] = (Number(current[field]) || 0) + (Number(month[field]) || 0);
    }
    months.set(key, current);
  }

  return [...months.values()].sort((left, right) => left.month - right.month);
};

export const isExactDuplicatePair = (left, right) => {
  const leftFingerprint = duplicateFingerprintForCard(left);
  const rightFingerprint = duplicateFingerprintForCard(right);
  return Boolean(leftFingerprint && rightFingerprint && leftFingerprint.key === rightFingerprint.key);
};

export const buildDuplicateMergeUpdate = (targetCard, sourceCard) => ({
  monthlyData: mergeMonthlyDataBySum(targetCard?.monthlyData ?? [], sourceCard?.monthlyData ?? []),
});
