import { createAdminCatalogRouteHandlers } from "@/lib/api/adminCatalogRouteCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";
import { readCatalogProducts, writeCatalogProducts } from "@/lib/catalog/adminCatalogStore.mjs";

const handlers = createAdminCatalogRouteHandlers({
  readCatalogProducts,
  writeCatalogProducts,
  requireAuth,
});

export const PATCH = handlers.updateProvider;

