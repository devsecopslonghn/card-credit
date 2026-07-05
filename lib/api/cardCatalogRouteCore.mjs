import { NextResponse } from "next/server.js";
import {
  getCatalogProductDetailResponse,
  getCatalogProductsResponse,
  getCatalogProvidersResponse,
} from "./cardCatalogApi.mjs";
import { handleApiError } from "./errorsCore.mjs";

export const getCatalogProvidersRoute = async () => {
  try {
    return NextResponse.json(getCatalogProvidersResponse());
  } catch (error) {
    return handleApiError("GET /api/card-catalog/providers failed", error);
  }
};

export const getCatalogProductsRoute = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") ?? undefined;
    return NextResponse.json(getCatalogProductsResponse(provider));
  } catch (error) {
    return handleApiError("GET /api/card-catalog/products failed", error);
  }
};

export const getCatalogProductDetailRoute = async (_request, context) => {
  try {
    const { presetId } = await context.params;
    return NextResponse.json(getCatalogProductDetailResponse(presetId));
  } catch (error) {
    return handleApiError("GET /api/card-catalog/products/:presetId failed", error);
  }
};
