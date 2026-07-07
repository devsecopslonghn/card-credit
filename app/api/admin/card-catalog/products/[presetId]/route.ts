import { createAdminCatalogRouteHandlers } from "@/lib/api/adminCatalogRouteCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";
import { readCatalogProducts, writeCatalogProducts } from "@/lib/catalog/adminCatalogStore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import AuthAuditLog from "@/models/AuthAuditLog";

const handlers = createAdminCatalogRouteHandlers({
  readCatalogProducts,
  writeCatalogProducts,
  requireAuth,
  AuditLogModel: AuthAuditLog,
  connectToDatabase,
});

export const PATCH = handlers.updateProduct;
