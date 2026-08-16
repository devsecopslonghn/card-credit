import { cardDuplicateGroupListSchema, cardPortfolioCardSchema } from "@card-credit/contracts";

const normalizeCard = (value) => {
  const record = value && typeof value === "object" ? value : {};
  const dto = cardPortfolioCardSchema.parse({ ...record, id: record._id ?? record.id });
  const { id, ...fields } = dto;
  return { ...record, ...fields, _id: id };
};

export const parseDuplicateGroups = (value) => {
  const input = Array.isArray(value)
    ? value.map((item) => {
      const group = item && typeof item === "object" ? item : {};
      const cards = Array.isArray(group.cards)
        ? group.cards.map((card) => card && typeof card === "object" ? { ...card, id: card._id ?? card.id } : card)
        : group.cards;
      return { ...group, cards };
    })
    : [];
  const parsed = cardDuplicateGroupListSchema.parse(input);
  return parsed.map((group) => ({ ...group, cards: group.cards.map(normalizeCard) }));
};
