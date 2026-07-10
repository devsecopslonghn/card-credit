import type { CardCatalogProduct, CardCatalogProvider } from "@/types/cardCatalog";
import {
  CARD_IMAGE_PLACEHOLDER_URL,
  MAX_OWNER_LENGTH,
  buildCreateCardPayload,
  buildOperationalUpdatePayload,
  calculateCardMetrics,
  calculateMonthNet,
  defaultMonthlyData,
  filterCardsByOwner,
  formatAnnualFee,
  formatDateDisplay,
  formatRateBps,
  formatVnd,
  getMonthlyData,
  getDisplayName,
  getNetwork,
  getProviderKey,
  getProviderName,
  getUniqueOwners,
  getUpcomingPayments,
  groupCardsByProvider,
  isLegacyCard,
  normalizeOwnerInput,
  numberOrZero,
  validateOwnerInput,
} from "@/lib/cards/uiCore.mjs";

export type MonthlyData = {
  month: number;
  spend?: number;
  cashback?: number;
  fee?: number;
  otherInterest?: number;
};

export type CreditCardView = {
  _id: string;
  presetId?: string | null;
  providerCode?: string | null;
  providerName?: string | null;
  displayName?: string | null;
  network?: string | null;
  legacy?: boolean;
  bank?: string;
  name?: string;
  type?: string;
  owner?: string;
  imageUrl?: string;
  annualFee?: number | null;
  targetSpendForWaiver?: number;
  annualFeeWaiverTarget?: number | null;
  statementDay?: number;
  paymentDueDays?: number;
  active?: boolean;
  statementDate?: string;
  paymentDueDate?: string;
  amountDueThisMonth?: number;
  isPaidThisMonth?: boolean;
  monthlyData?: MonthlyData[];
};

export type ProviderGroup = {
  providerKey: string;
  providerName: string;
  cards: CreditCardView[];
};

export type CatalogProviderOption = CardCatalogProvider;
export type CatalogProductOption = CardCatalogProduct;

export {
  CARD_IMAGE_PLACEHOLDER_URL,
  MAX_OWNER_LENGTH,
  buildCreateCardPayload,
  buildOperationalUpdatePayload,
  calculateCardMetrics,
  calculateMonthNet,
  defaultMonthlyData,
  filterCardsByOwner,
  formatAnnualFee,
  formatDateDisplay,
  formatRateBps,
  formatVnd,
  getDisplayName,
  getMonthlyData,
  getNetwork,
  getProviderKey,
  getProviderName,
  getUniqueOwners,
  getUpcomingPayments,
  groupCardsByProvider,
  isLegacyCard,
  normalizeOwnerInput,
  numberOrZero,
  validateOwnerInput,
};
