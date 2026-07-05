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
  export const createCardFromRequestBody: (
    input: Record<string, unknown>,
    deps?: Record<string, unknown>,
  ) => Promise<{ card: unknown; deprecatedLegacy: boolean }>;
  export const buildAllowedUpdate: (input: Record<string, unknown>) => {
    update: Record<string, unknown>;
    ignoredForbiddenFields: string[];
  };
  export const updateCardById: (id: string, input: Record<string, unknown>, deps?: Record<string, unknown>) => Promise<unknown>;
}

declare module "@/lib/api/cardCatalogApi.mjs" {
  export const getCatalogProvidersResponse: () => import("@/types/cardCatalog").CardCatalogApiResponse<
    import("@/types/cardCatalog").CardCatalogProvider[]
  >;
  export const getCatalogProductsResponse: (
    providerCode?: string,
  ) => import("@/types/cardCatalog").CardCatalogApiResponse<import("@/types/cardCatalog").CardCatalogProduct[]>;
  export const getCatalogProductDetailResponse: (
    presetId: string,
  ) => import("@/types/cardCatalog").CardCatalogApiResponse<import("@/types/cardCatalog").CardCatalogProduct>;
}

declare module "*.mjs";
