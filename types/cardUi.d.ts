declare module "@/lib/cards/uiCore.mjs" {
  export const CARD_IMAGE_PLACEHOLDER_URL: string;
  export const MAX_OWNER_LENGTH: number;
  export const normalizeOwnerInput: (owner: unknown) => string;
  export const validateOwnerInput: (owner: unknown) => { valid: boolean; owner: string; message: string };
  export const buildCreateCardPayload: (presetId: string, owner: string) => { presetId: string; owner: string };
  export const formatVnd: (value: unknown) => string;
  export const formatAnnualFee: (value: unknown) => string;
  export const formatDateDisplay: (dateStr: unknown) => string;
  export const getProviderName: (card: Record<string, unknown>) => string;
  export const getProviderKey: (card: Record<string, unknown>) => string;
  export const getDisplayName: (card: Record<string, unknown>) => string;
  export const getNetwork: (card: Record<string, unknown>) => string;
  export const isLegacyCard: (card: Record<string, unknown>) => boolean;
  export const compareCards: (left: Record<string, unknown>, right: Record<string, unknown>) => number;
  export const groupCardsByProvider: <T extends Record<string, unknown>>(
    cards: T[],
  ) => Array<{ providerKey: string; providerName: string; cards: T[] }>;
  export const getUniqueOwners: (cards: Array<Record<string, unknown>>) => string[];
  export const filterCardsByOwner: <T extends Record<string, unknown>>(cards: T[], owner: string) => T[];
  export const getUpcomingPayments: <T extends Record<string, unknown>>(cards: T[]) => T[];
}
