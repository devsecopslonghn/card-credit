import rawCardPresets from "@/data/card-presets.json";
import cardImageManifest from "@/data/card-image-manifest.json";
import {
  CARD_IMAGE_PLACEHOLDER_URL,
  createCatalogService,
  getCatalogImageUrl,
  toLegacyCardPreset,
} from "@/lib/cardCatalogCore.mjs";
import type {
  CardCatalogProduct,
  CardCatalogProvider,
  CardImageManifest,
  LegacyCardPresetFields,
} from "@/types/cardCatalog";

export { CARD_IMAGE_PLACEHOLDER_URL };

export type CardPreset = CardCatalogProduct & LegacyCardPresetFields;

const catalogService = createCatalogService(
  rawCardPresets as CardCatalogProduct[],
  cardImageManifest as CardImageManifest,
);

export const getAllCatalogProducts = (): CardCatalogProduct[] =>
  catalogService.getAllCatalogProducts() as CardCatalogProduct[];

export const getActiveCatalogProducts = (): CardCatalogProduct[] =>
  catalogService.getActiveCatalogProducts() as CardCatalogProduct[];

export const getCatalogProviders = (): CardCatalogProvider[] =>
  catalogService.getCatalogProviders() as CardCatalogProvider[];

export const getProductsByProvider = (providerCode: string): CardCatalogProduct[] =>
  catalogService.getProductsByProvider(providerCode) as CardCatalogProduct[];

export const getPresetById = (presetId: string): CardCatalogProduct | undefined =>
  catalogService.getPresetById(presetId) as CardCatalogProduct | undefined;

export const groupProductsByProvider = (): CardCatalogProvider[] =>
  catalogService.groupProductsByProvider() as CardCatalogProvider[];

export const cardPresets: CardPreset[] = catalogService.getLegacyCardPresets() as CardPreset[];

export { getCatalogImageUrl, toLegacyCardPreset };
