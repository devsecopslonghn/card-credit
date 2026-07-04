import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api/errors";
import { getCatalogProvidersResponse } from "@/lib/api/cardCatalogApi.mjs";
import type { CardCatalogApiResponse, CardCatalogProvider } from "@/types/cardCatalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json<CardCatalogApiResponse<CardCatalogProvider[]>>(getCatalogProvidersResponse());
  } catch (error) {
    return handleApiError("GET /api/card-catalog/providers failed", error);
  }
}
