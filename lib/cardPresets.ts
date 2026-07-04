import rawCardPresets from "@/data/card-presets.json";
import cardImageManifest from "@/data/card-image-manifest.json";
import type { CardCatalogProduct, LegacyCardPresetFields } from "@/types/cardCatalog";

type RawCardPreset = {
  id: string;
  bank: string;
  bankName: string;
  name: string;
  type: string;
  segment?: string;
  annualFee: number | null;
  targetSpendForWaiver?: number | null;
  imageUrl?: string | null;
  benefits?: string[];
  sourceUrl: string;
  sourceCheckedAt: string;
  theme: {
    background: string;
    accent: string;
  };
};

export type CardPreset = Omit<RawCardPreset, "imageUrl"> &
  LegacyCardPresetFields &
  CardCatalogProduct;

const cardImage = (title: string, subtitle: string, background: string, accent: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="450" viewBox="0 0 720 450">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${background}"/>
          <stop offset="1" stop-color="${accent}"/>
        </linearGradient>
      </defs>
      <rect width="720" height="450" rx="38" fill="url(#g)"/>
      <rect x="46" y="86" width="88" height="62" rx="12" fill="#f8fafc" opacity=".82"/>
      <circle cx="584" cy="92" r="38" fill="#ffffff" opacity=".22"/>
      <circle cx="626" cy="92" r="38" fill="#ffffff" opacity=".14"/>
      <text x="48" y="228" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="700" fill="#ffffff">${title}</text>
      <text x="48" y="286" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="500" fill="#ffffff" opacity=".82">${subtitle}</text>
      <text x="48" y="374" font-family="Arial, Helvetica, sans-serif" font-size="24" letter-spacing="6" fill="#ffffff" opacity=".88">****  ****  ****  2026</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const cardPresets: CardPreset[] = (rawCardPresets as RawCardPreset[]).map((preset, index) => {
  const imageUrl =
    (cardImageManifest as Record<string, string>)[preset.id] ||
    preset.imageUrl ||
    cardImage(
      `${preset.bank} ${preset.name}`,
      `${preset.bankName} ${preset.type}`,
      preset.theme.background,
      preset.theme.accent,
    );

  return {
    ...preset,
    imageUrl,
    presetId: preset.id,
    providerCode: preset.bank,
    providerName: preset.bankName,
    displayName: preset.name,
    network: preset.type,
    active: true,
    sortOrder: index + 1,
  };
});
