type DuplicateCardSource = {
  workspaceId?: unknown;
  presetId?: unknown;
  owner?: unknown;
};

export const normalizeDuplicateOwner = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ") : null;

export const duplicateFingerprint = (card: DuplicateCardSource) => {
  const owner = normalizeDuplicateOwner(card.owner);
  if (typeof card.workspaceId !== "string" || typeof card.presetId !== "string" || !owner) return null;
  return `${card.workspaceId}::${card.presetId}::${owner}`;
};

export const duplicateReason = "Same workspace, catalog preset and normalized owner.";
