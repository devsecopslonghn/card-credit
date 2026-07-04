export type CardCatalogProduct = {
  /**
   * Globally unique, stable product identifier.
   * Target convention: lowercase kebab-case.
   */
  presetId: string;
  providerCode: string;
  providerName: string;
  displayName: string;
  network: string;
  segment?: string;
  annualFee: number | null;
  targetSpendForWaiver?: number | null;
  imageUrl: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  active: boolean;
  sortOrder?: number;
};

export type CardCatalogProvider = {
  providerCode: string;
  providerName: string;
  logoUrl?: string;
  products: CardCatalogProduct[];
};

export type LegacyCardPresetFields = {
  id: string;
  bank: string;
  bankName: string;
  name: string;
  type: string;
  imageUrl: string;
};
