import mongoose from "mongoose";
import rawCardPresets from "../../data/card-presets.json" with { type: "json" };
import cardImageManifest from "../../data/card-image-manifest.json" with { type: "json" };
import { createCatalogService, getCatalogImageUrl } from "../cardCatalogCore.mjs";
import { buildDuplicateMergeUpdate, findDuplicateCardGroups, isExactDuplicatePair } from "../cards/dedupeCore.mjs";
import { errorContext, logError, logInfo, logWarn } from "../observability/logger.mjs";

const catalogService = createCatalogService(rawCardPresets, cardImageManifest);
const MAX_OWNER_LENGTH = 120;

class ServiceApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const apiError = (status, code, message, fields) => new ServiceApiError(status, code, message, fields);

const normalizeOwner = (owner) => {
  if (typeof owner !== "string") {
    throw apiError(400, "INVALID_OWNER", "Tên chủ thẻ không hợp lệ.", {
      owner: "Tên chủ thẻ là bắt buộc.",
    });
  }

  const normalized = owner.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw apiError(400, "INVALID_OWNER", "Tên chủ thẻ không hợp lệ.", {
      owner: "Tên chủ thẻ không được để trống.",
    });
  }

  if (normalized.length > MAX_OWNER_LENGTH) {
    throw apiError(400, "INVALID_OWNER", "Tên chủ thẻ không hợp lệ.", {
      owner: `Tên chủ thẻ không được vượt quá ${MAX_OWNER_LENGTH} ký tự.`,
    });
  }

  return normalized;
};

export const OPERATIONAL_UPDATE_FIELDS = new Set([
  "owner",
  "targetSpendForWaiver",
  "annualFeeWaiverTarget",
  "statementDay",
  "paymentDueDays",
  "active",
]);

export const FORBIDDEN_UPDATE_FIELDS = new Set([
  "presetId",
  "providerCode",
  "providerName",
  "displayName",
  "network",
  "bank",
  "name",
  "type",
  "annualFee",
  "imageUrl",
  "catalogVersion",
  "legacy",
]);

const LEGACY_CREATE_FIELDS = new Set([
  "bank",
  "name",
  "type",
  "owner",
  "imageUrl",
  "annualFee",
  "targetSpendForWaiver",
  "statementDate",
  "paymentDueDate",
  "amountDueThisMonth",
  "isPaidThisMonth",
  "monthlyData",
]);

export const defaultMonthlyData = () =>
  Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    spend: 0,
    cashback: 0,
    fee: 0,
    otherInterest: 0,
  }));

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const asOptionalString = (value, field) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
      [field]: `${field} phải là chuỗi.`,
    });
  }
  return value;
};

const asRequiredString = (value, field) => {
  const text = asOptionalString(value, field)?.trim();
  if (!text) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
      [field]: `${field} là bắt buộc.`,
    });
  }
  return text;
};

const asOptionalNumber = (value, field) => {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
      [field]: `${field} phải là số.`,
    });
  }
  return value;
};

const asOptionalBoolean = (value, field) => {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
      [field]: `${field} phải là boolean.`,
    });
  }
  return value;
};

const validateMonthlyData = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
      monthlyData: "monthlyData phải là mảng.",
    });
  }

  return value.map((item, index) => {
    if (!isObject(item)) {
      throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
        monthlyData: `monthlyData[${index}] không hợp lệ.`,
      });
    }

    const month = asOptionalNumber(item.month, `monthlyData[${index}].month`);
    if (!month || month < 1 || month > 12 || !Number.isInteger(month)) {
      throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
        monthlyData: `monthlyData[${index}].month phải là số nguyên từ 1 đến 12.`,
      });
    }

    return {
      month,
      spend: asOptionalNumber(item.spend, `monthlyData[${index}].spend`) ?? 0,
      cashback: asOptionalNumber(item.cashback, `monthlyData[${index}].cashback`) ?? 0,
      fee: asOptionalNumber(item.fee, `monthlyData[${index}].fee`) ?? 0,
      otherInterest: asOptionalNumber(item.otherInterest, `monthlyData[${index}].otherInterest`) ?? 0,
    };
  });
};

const modelFrom = (deps) => {
  if (!deps?.CardModel) {
    throw apiError(500, "DATABASE_ERROR", "Card model chưa được cấu hình.");
  }
  return deps.CardModel;
};

const ownershipFields = (session) =>
  session
    ? {
        userId: session.userId,
        workspaceId: session.workspaceId,
      }
    : {};

const workspaceQuery = (session, extra = {}) => (session ? { ...extra, workspaceId: session.workspaceId } : extra);

export const buildCardSnapshotFromProduct = (product, owner, session) => {
  const imageUrl = getCatalogImageUrl(product, cardImageManifest);

  return {
    ...ownershipFields(session),
    presetId: product.presetId,
    providerCode: product.providerCode,
    providerName: product.providerName,
    displayName: product.displayName,
    network: product.network,
    catalogVersion: "json-v1",
    legacy: false,
    bank: product.providerCode,
    name: product.displayName,
    type: product.network,
    owner,
    imageUrl,
    annualFee: product.annualFee,
    targetSpendForWaiver: product.targetSpendForWaiver ?? 0,
    annualFeeWaiverTarget: product.targetSpendForWaiver ?? null,
    statementDay: 1,
    paymentDueDays: 15,
    active: true,
    statementDate: "",
    paymentDueDate: "",
    amountDueThisMonth: 0,
    isPaidThisMonth: false,
    monthlyData: defaultMonthlyData(),
  };
};

export const createCardFromPreset = async (input, deps = {}) => {
  const presetId = asRequiredString(input?.presetId, "presetId");
  const owner = normalizeOwner(input?.owner);
  const product = catalogService.getPresetById(presetId);

  if (!product) {
    logWarn("PRESET_LOOKUP_FAILED", { presetId });
    throw apiError(404, "PRESET_NOT_FOUND", "Không tìm thấy Card Product.");
  }

  if (!product.active) {
    logWarn("PRESET_INACTIVE_CREATE_BLOCKED", { presetId });
    throw apiError(409, "PRESET_INACTIVE", "Card Product hiện không còn hoạt động.");
  }

  const CardModel = modelFrom(deps);
  try {
    const card = await CardModel.create(buildCardSnapshotFromProduct(product, owner, deps.session));
    logInfo("CARD_CREATE_SUCCESS", {
      presetId,
      providerCode: product.providerCode,
      cardId: card?._id?.toString?.() ?? card?._id,
    });
    return card;
  } catch (error) {
    logError("CARD_CREATE_FAILURE", {
      presetId,
      providerCode: product.providerCode,
      ...errorContext(error),
    });
    throw error;
  }
};

export const createLegacyCard = async (input, deps = {}) => {
  if (!isObject(input)) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.");
  }

  const allowedInput = {};
  for (const field of LEGACY_CREATE_FIELDS) {
    if (input[field] !== undefined) allowedInput[field] = input[field];
  }

  const owner = normalizeOwner(allowedInput.owner);
  const monthlyData = validateMonthlyData(allowedInput.monthlyData);
  const payload = {
    ...ownershipFields(deps.session),
    bank: asRequiredString(allowedInput.bank, "bank"),
    name: asRequiredString(allowedInput.name, "name"),
    type: asRequiredString(allowedInput.type, "type"),
    owner,
    imageUrl: asRequiredString(allowedInput.imageUrl, "imageUrl"),
    annualFee: asOptionalNumber(allowedInput.annualFee, "annualFee"),
    targetSpendForWaiver: asOptionalNumber(allowedInput.targetSpendForWaiver, "targetSpendForWaiver") ?? 0,
    annualFeeWaiverTarget: asOptionalNumber(allowedInput.targetSpendForWaiver, "targetSpendForWaiver") ?? null,
    statementDay: 1,
    paymentDueDays: 15,
    active: true,
    statementDate: asOptionalString(allowedInput.statementDate, "statementDate") ?? "",
    paymentDueDate: asOptionalString(allowedInput.paymentDueDate, "paymentDueDate") ?? "",
    amountDueThisMonth: asOptionalNumber(allowedInput.amountDueThisMonth, "amountDueThisMonth") ?? 0,
    isPaidThisMonth: asOptionalBoolean(allowedInput.isPaidThisMonth, "isPaidThisMonth") ?? false,
    monthlyData: monthlyData ?? defaultMonthlyData(),
    legacy: true,
  };

  if (payload.annualFee === undefined) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
      annualFee: "annualFee là bắt buộc.",
    });
  }

  logWarn("LEGACY_CARD_CREATE_USED", {
    provider: payload.bank,
    network: payload.type,
  });
  const CardModel = modelFrom(deps);
  try {
    const card = await CardModel.create(payload);
    logInfo("LEGACY_CARD_CREATE_SUCCESS", {
      cardId: card?._id?.toString?.() ?? card?._id,
      provider: payload.bank,
      network: payload.type,
    });
    return card;
  } catch (error) {
    logError("LEGACY_CARD_CREATE_FAILURE", {
      provider: payload.bank,
      network: payload.type,
      ...errorContext(error),
    });
    throw error;
  }
};

export const createCardFromRequestBody = async (input, deps = {}) => {
  const usesCatalogContract = typeof input?.presetId === "string";

  if (!usesCatalogContract && !(isObject(input) && "bank" in input)) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
      presetId: "presetId là bắt buộc cho catalog-first contract.",
    });
  }

  return {
    card: usesCatalogContract ? await createCardFromPreset(input, deps) : await createLegacyCard(input, deps),
    deprecatedLegacy: !usesCatalogContract,
  };
};

export const buildAllowedUpdate = (input) => {
  if (!isObject(input)) {
    throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.");
  }

  const update = {};
  const forbiddenFields = [];

  for (const [field, value] of Object.entries(input)) {
    if (OPERATIONAL_UPDATE_FIELDS.has(field)) {
      if (field === "owner") update.owner = normalizeOwner(value);
      if (field === "targetSpendForWaiver") update.targetSpendForWaiver = asOptionalNumber(value, field);
      if (field === "annualFeeWaiverTarget") update.annualFeeWaiverTarget = asOptionalNumber(value, field);
      if (field === "statementDay") {
        const statementDay = asOptionalNumber(value, field);
        if (!Number.isInteger(statementDay) || statementDay < 1 || statementDay > 31) {
          throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
            statementDay: "statementDay phải là số nguyên từ 1 đến 31.",
          });
        }
        update.statementDay = statementDay;
      }
      if (field === "paymentDueDays") {
        const paymentDueDays = asOptionalNumber(value, field);
        if (!Number.isInteger(paymentDueDays) || paymentDueDays < 1) {
          throw apiError(400, "INVALID_REQUEST", "Request body không hợp lệ.", {
            paymentDueDays: "paymentDueDays phải là số nguyên lớn hơn 0.",
          });
        }
        update.paymentDueDays = paymentDueDays;
      }
      if (field === "active") update.active = asOptionalBoolean(value, field);
      continue;
    }

    if (FORBIDDEN_UPDATE_FIELDS.has(field)) forbiddenFields.push(field);
  }

  if (Object.keys(update).length === 0) {
    throw apiError(400, "FORBIDDEN_UPDATE_FIELD", "Không có field hợp lệ để cập nhật.", {
      fields: forbiddenFields.length > 0 ? forbiddenFields.join(", ") : "Không có field được phép.",
    });
  }

  return { update, ignoredForbiddenFields: forbiddenFields };
};

export const updateCardById = async (id, input, deps = {}) => {
  if (!mongoose.isValidObjectId(id)) {
    throw apiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
  }

  const { update } = buildAllowedUpdate(input);
  const CardModel = modelFrom(deps);
  const updatedCard = await CardModel.findByIdAndUpdate(id, update, { returnDocument: "after" });

  if (!updatedCard) {
    throw apiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
  }

  return updatedCard;
};

export const findDuplicateCards = async (deps = {}) => {
  const CardModel = modelFrom(deps);
  const cards = await CardModel.find(workspaceQuery(deps.session)).sort({ createdAt: 1 });
  return findDuplicateCardGroups(cards);
};

export const mergeDuplicateCards = async (input, deps = {}) => {
  const sourceCardId = asRequiredString(input?.sourceCardId, "sourceCardId");
  const targetCardId = asRequiredString(input?.targetCardId, "targetCardId");

  if (sourceCardId === targetCardId) {
    throw apiError(400, "INVALID_MERGE_TARGET", "Không thể merge một thẻ vào chính nó.");
  }

  if (!mongoose.isValidObjectId(sourceCardId) || !mongoose.isValidObjectId(targetCardId)) {
    throw apiError(400, "INVALID_CARD_ID", "Card id không hợp lệ.");
  }

  const CardModel = modelFrom(deps);
  const [sourceCard, targetCard] = await Promise.all([CardModel.findById(sourceCardId), CardModel.findById(targetCardId)]);

  if (!sourceCard || !targetCard) {
    throw apiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ cần merge.");
  }

  if (deps.session && (sourceCard.workspaceId !== deps.session.workspaceId || targetCard.workspaceId !== deps.session.workspaceId)) {
    throw apiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ cần merge.");
  }

  if (!isExactDuplicatePair(sourceCard, targetCard)) {
    throw apiError(409, "DUPLICATE_MISMATCH", "Hai thẻ không phải duplicate exact-match.");
  }

  const update = buildDuplicateMergeUpdate(targetCard, sourceCard);
  const updatedTarget = await CardModel.findByIdAndUpdate(targetCardId, update, { returnDocument: "after" });
  await CardModel.findByIdAndDelete(sourceCardId);

  logInfo("CARD_DUPLICATE_MERGED", {
    sourceCardId,
    targetCardId,
    workspaceId: targetCard.workspaceId,
    presetId: targetCard.presetId,
    owner: targetCard.owner,
    monthlyDataStrategy: "sum",
  });

  return {
    targetCard: updatedTarget,
    deletedSourceId: sourceCardId,
    merge: {
      sourceCardId,
      targetCardId,
      monthlyDataStrategy: "sum",
      reason: "Same workspace, catalog preset and normalized owner.",
    },
  };
};
