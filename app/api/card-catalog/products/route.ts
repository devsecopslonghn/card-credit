import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getCatalogProductsResponse } from "@/lib/api/cardCatalogApi.mjs";
import type { CardCatalogApiResponse, CardCatalogProduct } from "@/types/cardCatalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") ?? undefined;
    return NextResponse.json<CardCatalogApiResponse<CardCatalogProduct[]>>(getCatalogProductsResponse(provider));
  } catch (error) {
    return handleApiError("GET /api/card-catalog/products failed", error);
  }
}
