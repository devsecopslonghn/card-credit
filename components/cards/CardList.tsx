"use client";

import { ProviderSection } from "@/components/cards/ProviderSection";
import type { CardSummaryView, CreditCardView, ProviderGroup } from "@/components/cards/cardTypes";

type CardListProps = {
  loading: boolean;
  error: string;
  cardsCount: number;
  filteredCardsCount: number;
  providerGroups: ProviderGroup[];
  cardSummaries: Record<string, CardSummaryView>;
  selectedOwner: string;
  busyCardId: string;
  onRetry: () => void;
  onDelete: (card: CreditCardView) => void;
};

export function CardList({
  loading,
  error,
  cardsCount,
  filteredCardsCount,
  providerGroups,
  cardSummaries,
  selectedOwner,
  busyCardId,
  onRetry,
  onDelete,
}: CardListProps) {
  if (loading) {
    return (
      <div className="cc-section rounded-xl p-10 text-center font-medium cc-text-muted" role="status">
        Đang tải danh sách thẻ...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center" role="alert">
        <p className="font-semibold text-red-700">{error}</p>
        <button type="button" onClick={onRetry} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">
          Tải lại
        </button>
      </div>
    );
  }

  if (cardsCount === 0) {
    return (
      <div className="cc-section rounded-xl border-dashed p-10 text-center">
        <p className="font-bold cc-text-primary">Chưa có thẻ nào.</p>
        <p className="mt-1 text-sm font-medium cc-text-muted">Thêm thẻ đầu tiên bằng Card Catalog.</p>
      </div>
    );
  }

  if (filteredCardsCount === 0) {
    return (
      <div className="cc-section rounded-xl border-dashed p-10 text-center">
        <p className="font-bold cc-text-primary">Không có thẻ phù hợp với bộ lọc.</p>
        <p className="mt-1 text-sm font-medium cc-text-muted">Bộ lọc hiện tại: {selectedOwner || "Không xác định"}.</p>
      </div>
    );
  }

  return (
    <div>
      {providerGroups.map((group) => (
        <ProviderSection
          key={group.providerKey}
          group={group}
          cardSummaries={cardSummaries}
          busyCardId={busyCardId}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
