import { NextResponse } from "next/server.js";
import { validateCatalogProducts } from "../cardCatalogCore.mjs";
import { ApiError, handleApiError, parseJsonRequest } from "./errorsCore.mjs";

const PRODUCT_UPDATE_FIELDS = new Set([
  "providerCode",
  "providerName",
  "displayName",
  "network",
  "segment",
  "annualFee",
  "targetSpendForWaiver",
  "imageUrl",
  "benefits",
  "sourceUrl",
  "sourceCheckedAt",
  "active",
  "sortOrder",
  "theme",
]);

const legacyAliasesFor = (product) => ({
  id: product.presetId,
  bank: product.providerCode,
  bankName: product.providerName,
  name: product.displayName,
  type: product.network,
});

const normalizeProduct = (product) => {
  const normalized = {
    ...product,
    providerCode: typeof product.providerCode === "string" ? product.providerCode.trim().toUpperCase() : product.providerCode,
    providerName: typeof product.providerName === "string" ? product.providerName.trim() : product.providerName,
    displayName: typeof product.displayName === "string" ? product.displayName.trim() : product.displayName,
    network: typeof product.network === "string" ? product.network.trim() : product.network,
    sourceUrl: typeof product.sourceUrl === "string" ? product.sourceUrl.trim() : product.sourceUrl,
    sourceCheckedAt: typeof product.sourceCheckedAt === "string" ? product.sourceCheckedAt.trim() : product.sourceCheckedAt,
    imageUrl: product.imageUrl === "" ? null : product.imageUrl,
  };
  return { ...normalized, ...legacyAliasesFor(normalized) };
};

const adminSession = (requireAuth, request) => {
  const session = requireAuth(request);
  if (session.role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
  }
  return session;
};

const validateNextCatalog = (products) => {
  const issues = validateCatalogProducts(products);
  if (issues.length > 0) {
    throw new ApiError(400, "INVALID_REQUEST", "Catalog không hợp lệ.", {
      catalog: issues.map((issue) => `${issue.presetId}.${issue.field}: ${issue.code}`).join("; "),
    });
  }
};

const auditFor = (session) => ({
  updatedBy: session.email,
  updatedByUserId: session.userId,
  updatedAt: new Date().toISOString(),
  storage: "data/card-presets.json",
});

const persist = async (writeCatalogProducts, products) => {
  if (writeCatalogProducts) await writeCatalogProducts(products);
};

export const createAdminCatalogRouteHandlers = ({ readCatalogProducts, writeCatalogProducts, requireAuth }) => ({
  async listProducts(request) {
    try {
      const session = adminSession(requireAuth, request);
      const products = await readCatalogProducts();
      return NextResponse.json({ data: products, audit: auditFor(session) });
    } catch (error) {
      return handleApiError("GET /api/admin/card-catalog/products failed", error);
    }
  },

  async createProduct(request) {
    try {
      const session = adminSession(requireAuth, request);
      const body = await parseJsonRequest(request);
      const products = await readCatalogProducts();

      if (products.some((product) => product.presetId === body.presetId)) {
        throw new ApiError(409, "INVALID_REQUEST", "Card Product đã tồn tại.", { presetId: "presetId bị trùng." });
      }

      const product = normalizeProduct(body);
      const nextProducts = [...products, product];
      validateNextCatalog(nextProducts);
      await persist(writeCatalogProducts, nextProducts);

      return NextResponse.json({ data: product, audit: auditFor(session) }, { status: 201 });
    } catch (error) {
      return handleApiError("POST /api/admin/card-catalog/products failed", error);
    }
  },

  async updateProduct(request, context) {
    try {
      const session = adminSession(requireAuth, request);
      const { presetId } = await context.params;
      const body = await parseJsonRequest(request);
      const products = await readCatalogProducts();
      const index = products.findIndex((product) => product.presetId === presetId);

      if (index === -1) {
        throw new ApiError(404, "PRESET_NOT_FOUND", "Không tìm thấy Card Product.");
      }

      const update = {};
      for (const [field, value] of Object.entries(body)) {
        if (PRODUCT_UPDATE_FIELDS.has(field)) update[field] = value;
      }
      if (Object.keys(update).length === 0) {
        throw new ApiError(400, "INVALID_REQUEST", "Không có field catalog hợp lệ để cập nhật.");
      }

      const nextProducts = products.map((product, productIndex) =>
        productIndex === index ? normalizeProduct({ ...product, ...update }) : product,
      );
      validateNextCatalog(nextProducts);
      await persist(writeCatalogProducts, nextProducts);

      return NextResponse.json({ data: nextProducts[index], audit: auditFor(session) });
    } catch (error) {
      return handleApiError("PATCH /api/admin/card-catalog/products/:presetId failed", error);
    }
  },

  async updateProvider(request, context) {
    try {
      const session = adminSession(requireAuth, request);
      const { providerCode } = await context.params;
      const body = await parseJsonRequest(request);
      const products = await readCatalogProducts();
      const normalizedProviderCode = providerCode.toUpperCase();
      let changed = 0;

      const nextProducts = products.map((product) => {
        if (product.providerCode !== normalizedProviderCode) return product;
        changed += 1;
        return normalizeProduct({
          ...product,
          ...(typeof body.providerName === "string" ? { providerName: body.providerName } : {}),
          ...(typeof body.active === "boolean" ? { active: body.active } : {}),
        });
      });

      if (changed === 0) {
        throw new ApiError(404, "PROVIDER_NOT_FOUND", "Không tìm thấy provider.", {
          provider: normalizedProviderCode,
        });
      }

      validateNextCatalog(nextProducts);
      await persist(writeCatalogProducts, nextProducts);

      return NextResponse.json({
        data: {
          providerCode: normalizedProviderCode,
          affectedProducts: changed,
        },
        audit: auditFor(session),
      });
    } catch (error) {
      return handleApiError("PATCH /api/admin/card-catalog/providers/:providerCode failed", error);
    }
  },
});
