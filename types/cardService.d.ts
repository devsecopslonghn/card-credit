declare module "@/lib/services/cardService.mjs" {
  export const OPERATIONAL_UPDATE_FIELDS: Set<string>;
  export const FORBIDDEN_UPDATE_FIELDS: Set<string>;
  export const defaultMonthlyData: () => Array<{
    month: number;
    spend: number;
    cashback: number;
    fee: number;
    otherInterest: number;
  }>;
  export const buildCardSnapshotFromProduct: (product: import("@/types/cardCatalog").CardCatalogProduct, owner: string) => Record<string, unknown>;
  export const createCardFromPreset: (input: Record<string, unknown>, deps?: Record<string, unknown>) => Promise<unknown>;
  export const createLegacyCard: (input: Record<string, unknown>, deps?: Record<string, unknown>) => Promise<unknown>;
  export const buildAllowedUpdate: (input: Record<string, unknown>) => {
    update: Record<string, unknown>;
    ignoredForbiddenFields: string[];
  };
  export const updateCardById: (id: string, input: Record<string, unknown>, deps?: Record<string, unknown>) => Promise<unknown>;
}
