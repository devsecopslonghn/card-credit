import { createAdminCatalogRouteHandlers } from "@/lib/api/adminCatalogRouteCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";
import { readCatalogProducts, writeCatalogProducts } from "@/lib/catalog/adminCatalogStore.mjs";

export const dynamic = "force-dynamic";

const handlers = createAdminCatalogRouteHandlers({
  readCatalogProducts,
  writeCatalogProducts,
  requireAuth,
});

export const GET = handlers.listProducts;
export const POST = handlers.createProduct;

