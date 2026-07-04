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
  benefits?: string[];
  theme?: {
    background: string;
    accent: string;
  };
};

export type CardCatalogProvider = {
  providerCode: string;
  providerName: string;
  logoUrl?: string;
  products: CardCatalogProduct[];
};

export type CardCatalogApiResponse<T> = {
  data: T;
};

export type LegacyCardPresetFields = {
  id: string;
  bank: string;
  bankName: string;
  name: string;
  type: string;
  imageUrl: string;
};

export type CardImageManifestEntry = {
  status: "cached" | "placeholder" | "remote" | "failed" | "skipped";
  sourceUrl?: string | null;
  localPath?: string;
  reason?: string;
  checkedAt: string;
};

export type CardImageManifest = Record<string, CardImageManifestEntry | string>;
