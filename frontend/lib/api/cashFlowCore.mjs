import { monthlyCashFlowResponseSchema } from "@card-credit/contracts";

export const parseMonthlyCashFlow = (value) => {
  const parsed = monthlyCashFlowResponseSchema.parse(value);
  return {
    ...parsed,
    data: parsed.data.map((row) => ({
      ...row,
      card: row.card ? { ...row.card, bank: row.card.providerName ?? undefined, name: row.card.displayName ?? undefined } : null,
    })),
  };
};
