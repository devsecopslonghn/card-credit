import type { CreditCardView } from "@/components/cards/cardTypes";

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

export const fetchCards = async (): Promise<CreditCardView[]> => {
  const response = await fetch(`/api/cards?timestamp=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await parseApiError(response, "Không thể tải danh sách thẻ."));
  return (await response.json()) as CreditCardView[];
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
      | "statementDate"
      | "paymentDueDate"
      | "amountDueThisMonth"
      | "isPaidThisMonth"
      | "monthlyData"
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
