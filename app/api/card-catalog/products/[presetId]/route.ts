import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getCatalogProductDetailResponse } from "@/lib/api/cardCatalogApi.mjs";
import type { CardCatalogApiResponse, CardCatalogProduct } from "@/types/cardCatalog";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ presetId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { presetId } = await context.params;
    return NextResponse.json<CardCatalogApiResponse<CardCatalogProduct>>(getCatalogProductDetailResponse(presetId));
  } catch (error) {
    return handleApiError("GET /api/card-catalog/products/:presetId failed", error);
  }
}
