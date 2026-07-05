import { NextResponse } from "next/server.js";
import {
  getCatalogProductDetailResponse,
  getCatalogProductsResponse,
  getCatalogProvidersResponse,
} from "./cardCatalogApi.mjs";
import { handleApiError } from "./errorsCore.mjs";
import { errorContext, logError, logWarn } from "../observability/logger.mjs";

export const getCatalogProvidersRoute = async () => {
  try {
    return NextResponse.json(getCatalogProvidersResponse());
  } catch (error) {
    logError("CATALOG_LOAD_FAILURE", {
      route: "GET /api/card-catalog/providers",
      ...errorContext(error),
    });
    return handleApiError("GET /api/card-catalog/providers failed", error);
  }
};

export const getCatalogProductsRoute = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") ?? undefined;
    return NextResponse.json(getCatalogProductsResponse(provider));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "PROVIDER_NOT_FOUND") {
      const { searchParams } = new URL(request.url);
      logWarn("PROVIDER_LOOKUP_FAILED", {
        provider: searchParams.get("provider")?.toUpperCase() ?? "",
        route: "GET /api/card-catalog/products",
      });
    } else {
      logError("CATALOG_LOAD_FAILURE", {
        route: "GET /api/card-catalog/products",
        ...errorContext(error),
      });
    }
    return handleApiError("GET /api/card-catalog/products failed", error);
  }
};

export const getCatalogProductDetailRoute = async (_request, context) => {
  try {
    const { presetId } = await context.params;
    return NextResponse.json(getCatalogProductDetailResponse(presetId));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "PRESET_NOT_FOUND") {
      const { presetId } = await context.params;
      logWarn("PRESET_LOOKUP_FAILED", { presetId, route: "GET /api/card-catalog/products/:presetId" });
    } else {
      logError("CATALOG_LOAD_FAILURE", {
        route: "GET /api/card-catalog/products/:presetId",
        ...errorContext(error),
      });
    }
    return handleApiError("GET /api/card-catalog/products/:presetId failed", error);
  }
};
