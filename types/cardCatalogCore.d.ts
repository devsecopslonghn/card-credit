declare module "@/lib/cardCatalogCore.mjs" {
  import type { CardCatalogProduct, CardCatalogProvider, CardImageManifest } from "@/types/cardCatalog";

  export const CARD_IMAGE_PLACEHOLDER_URL: string;
  export const ALLOWED_NETWORKS: Set<string>;
  export const sortCatalogProducts: (products: CardCatalogProduct[]) => CardCatalogProduct[];
  export const getCatalogImageUrl: (product: CardCatalogProduct, manifest?: CardImageManifest) => string;
  export const toLegacyCardPreset: (product: CardCatalogProduct, manifest?: CardImageManifest) => CardCatalogProduct & {
    id: string;
    bank: string;
    bankName: string;
    name: string;
    type: string;
    imageUrl: string;
  };
  export const createCatalogService: (
    rawProducts: CardCatalogProduct[],
    manifest?: CardImageManifest,
  ) => {
    getAllCatalogProducts: () => CardCatalogProduct[];
    getActiveCatalogProducts: () => CardCatalogProduct[];
    getCatalogProviders: () => CardCatalogProvider[];
    getProductsByProvider: (providerCode: string) => CardCatalogProduct[];
    getPresetById: (presetId: string) => CardCatalogProduct | undefined;
    groupProductsByProvider: () => CardCatalogProvider[];
    getLegacyCardPresets: () => Array<CardCatalogProduct & {
      id: string;
      bank: string;
      bankName: string;
      name: string;
      type: string;
      imageUrl: string;
    }>;
  };
}
