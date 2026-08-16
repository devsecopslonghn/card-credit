import type { CardCatalogApiResponse, CardCatalogProduct, CardCatalogProvider } from "@/types/cardCatalog";
import { catalogProductListSchema, catalogProviderListSchema } from "@card-credit/contracts";

const parseCatalogError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
};

export const fetchCatalogProviders = async (): Promise<CardCatalogProvider[]> => {
  const response = await fetch("/api/card-catalog/providers", { cache: "no-store" });
  if (!response.ok) throw new Error(await parseCatalogError(response, "Không thể tải danh sách provider."));
  const body = (await response.json()) as CardCatalogApiResponse<unknown>;
  return catalogProviderListSchema.parse(body.data) as CardCatalogProvider[];
};

export const fetchCatalogProducts = async (providerCode: string): Promise<CardCatalogProduct[]> => {
  const response = await fetch(`/api/card-catalog/products?provider=${encodeURIComponent(providerCode)}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await parseCatalogError(response, "Không thể tải danh sách sản phẩm thẻ."));
  const body = (await response.json()) as CardCatalogApiResponse<unknown>;
  return catalogProductListSchema.parse(body.data) as CardCatalogProduct[];
};
