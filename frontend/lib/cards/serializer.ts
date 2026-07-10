import {
  serializeCreditCard as serializeCreditCardCore,
  serializeCreditCards as serializeCreditCardsCore,
} from "./serializerCore.mjs";

type PlainCard = Record<string, unknown> & {
  presetId?: string;
  providerName?: string;
  displayName?: string;
  network?: string;
  bank?: string;
  name?: string;
  type?: string;
  legacy?: boolean;
};

export const serializeCreditCard = (card: unknown): PlainCard => serializeCreditCardCore(card) as PlainCard;

export const serializeCreditCards = (cards: unknown[]): PlainCard[] =>
  serializeCreditCardsCore(cards) as PlainCard[];
