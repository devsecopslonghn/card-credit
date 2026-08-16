import type { CreditCardView } from "@/components/cards/cardTypes";
import { cardPortfolioCardSchema, cardPortfolioListSchema } from "@card-credit/contracts";
import type { CardDuplicateGroupDto } from "@card-credit/contracts";
import { parseDuplicateGroups } from "./cardDuplicatesCore.mjs";

export type DuplicateCardGroup = Omit<CardDuplicateGroupDto, "cards"> & { cards: CreditCardView[] };

type DuplicateGroupsResponse = {
  data?: unknown;
};

type DuplicateMergeResponse = {
  data?: {
    targetCard: CreditCardView;
    deletedSourceId: string;
    merge: {
      sourceCardId: string;
      targetCardId: string;
      monthlyDataStrategy: string;
      reason: string;
    };
  };
};

type ApiErrorBody = {
  error?: {
    message?: string;
    fields?: Record<string, string>;
  };
  message?: string;
};

const parseApiError = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error?.message || body.message || fallback;
  } catch {
    return fallback;
  }
};

const normalizeCard = (value: unknown): CreditCardView => {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const dto = cardPortfolioCardSchema.parse({ ...record, id: typeof record._id === "string" ? record._id : record.id });
  const { id, ...fields } = dto;
  return { ...record, ...fields, _id: id } as CreditCardView;
};

export const fetchCards = async (): Promise<CreditCardView[]> => {
  const response = await fetch(`/api/cards?timestamp=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể tải danh sách thẻ."));
  const raw = await response.json() as unknown;
  const canonicalInput = Array.isArray(raw)
    ? raw.map((item) => item && typeof item === "object" ? { ...(item as Record<string, unknown>), id: (item as Record<string, unknown>)._id } : item)
    : raw;
  const body = cardPortfolioListSchema.parse(canonicalInput);
  return body.map(normalizeCard);
};

export const fetchCard = async (cardId: string): Promise<CreditCardView> => {
  const response = await fetch(`/api/cards/${cardId}?timestamp=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể tải thông tin thẻ."));
  return normalizeCard(await response.json());
};

export const createCard = async (payload: { presetId: string; owner: string }): Promise<CreditCardView> => {
  const response = await fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await parseApiError(response, "Không thể tạo thẻ."));
  return (await response.json()) as CreditCardView;
};

export const updateCardOperational = async (
  cardId: string,
  payload: Partial<
    Pick<
      CreditCardView,
      | "owner"
      | "targetSpendForWaiver"
      | "annualFeeWaiverTarget"
      | "statementDay"
      | "paymentDueDays"
      | "cashbackCapAmount"
      | "cashbackCapPeriod"
      | "active"
      | "reminderEnabled"
      | "reminderDaysBefore"
      | "reminderTimezone"
      | "reminderTime"
    >
  >,
): Promise<CreditCardView> => {
  const response = await fetch(`/api/cards/${cardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await parseApiError(response, "Không thể cập nhật thẻ."));
  return (await response.json()) as CreditCardView;
};

export const deleteCard = async (cardId: string) => {
  const response = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể xóa thẻ."));
};

export const fetchDuplicateCards = async (): Promise<DuplicateCardGroup[]> => {
  const response = await fetch(`/api/cards/duplicates?timestamp=${Date.now()}`, { cache: "no-store" });
 if (!response.ok) throw new Error(await parseApiError(response, "Không thể kiểm tra thẻ trùng."));
 const body = (await response.json()) as DuplicateGroupsResponse;
  return parseDuplicateGroups(body.data) as DuplicateCardGroup[];
};

export const mergeDuplicateCards = async (payload: {
  sourceCardId: string;
  targetCardId: string;
}): Promise<DuplicateMergeResponse["data"]> => {
  const response = await fetch("/api/cards/duplicates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await parseApiError(response, "Không thể merge thẻ trùng."));
  const body = (await response.json()) as DuplicateMergeResponse;
  return body.data;
};
