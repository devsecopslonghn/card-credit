import type { CatalogProductDto, CatalogProviderDto } from "@card-credit/contracts";

export type CardCatalogProduct = CatalogProductDto;
export type CardCatalogProvider = CatalogProviderDto;

export type CardCatalogApiResponse<T> = {
  data: T;
};

export type CardImageManifestEntry = {
  status: "cached" | "placeholder" | "remote" | "failed" | "skipped";
  sourceUrl?: string | null;
  localPath?: string;
  reason?: string;
  checkedAt: string;
};

export type CardImageManifest = Record<string, CardImageManifestEntry | string>;
