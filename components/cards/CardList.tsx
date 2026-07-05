"use client";

import { ProviderSection } from "@/components/cards/ProviderSection";
import type { CreditCardView, ProviderGroup } from "@/components/cards/cardTypes";

type CardListProps = {
  loading: boolean;
  error: string;
  cardsCount: number;
  filteredCardsCount: number;
  providerGroups: ProviderGroup[];
  selectedOwner: string;
  busyCardId: string;
  onRetry: () => void;
  onEdit: (card: CreditCardView) => void;
  onDelete: (card: CreditCardView) => void;
  onTogglePaid: (card: CreditCardView, checked: boolean) => void;
};

export function CardList({
  loading,
  error,
  cardsCount,
  filteredCardsCount,
  providerGroups,
  selectedOwner,
  busyCardId,
  onRetry,
  onEdit,
  onDelete,
  onTogglePaid,
}: CardListProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500" role="status">
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
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="font-semibold text-gray-700">Chưa có thẻ nào.</p>
        <p className="mt-1 text-sm text-gray-500">Thêm thẻ đầu tiên bằng Card Catalog.</p>
      </div>
    );
  }

  if (filteredCardsCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="font-semibold text-gray-700">Không có thẻ phù hợp với bộ lọc.</p>
        <p className="mt-1 text-sm text-gray-500">Bộ lọc hiện tại: {selectedOwner || "Không xác định"}.</p>
      </div>
    );
  }

  return (
    <div>
      {providerGroups.map((group) => (
        <ProviderSection
          key={group.providerKey}
          group={group}
          busyCardId={busyCardId}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePaid={onTogglePaid}
        />
      ))}
    </div>
  );
}
