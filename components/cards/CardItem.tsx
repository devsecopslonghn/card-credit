"use client";

import Link from "next/link";
import {
  CARD_IMAGE_PLACEHOLDER_URL,
  formatAnnualFee,
  getDisplayName,
  getNetwork,
  getProviderName,
  isLegacyCard,
  type CreditCardView,
} from "@/components/cards/cardTypes";

type CardItemProps = {
  card: CreditCardView;
  busy: boolean;
  onDelete: (card: CreditCardView) => void;
};

export function CardItem({ card, busy, onDelete }: CardItemProps) {
  const displayName = getDisplayName(card);
  const providerName = getProviderName(card);
  const network = getNetwork(card);
  const legacy = isLegacyCard(card);

  return (
    <article className="flex min-w-0 h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <Link href={`/cards/${card._id}`} className="block outline-none focus:ring-2 focus:ring-blue-500">
        <div className="relative flex aspect-[1.58/1] max-h-48 w-full items-center justify-center overflow-hidden bg-gray-50 p-3">
          <img
            src={card.imageUrl || CARD_IMAGE_PLACEHOLDER_URL}
            alt={`${providerName} ${displayName}`}
            className="h-full max-h-full w-full max-w-full object-contain"
            onError={(event) => {
              event.currentTarget.src = CARD_IMAGE_PLACEHOLDER_URL;
            }}
          />
          <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-gray-700 shadow-sm">
            {network}
          </div>
          {legacy && (
            <div className="absolute left-3 top-3 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
              Legacy
            </div>
          )}
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-500">{providerName}</p>
          <h3
            className="line-clamp-3 break-words text-base font-bold leading-snug text-gray-900"
            title={displayName}
          >
            {displayName}
          </h3>
          <p className="mt-1 break-words text-xs font-semibold text-blue-700">Thẻ của: {card.owner || "Tôi"}</p>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <dt className="min-w-0 text-gray-500">Phí thường niên</dt>
            <dd className="max-w-[11rem] text-right font-semibold text-gray-900">{formatAnnualFee(card.annualFee)}</dd>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <dt className="min-w-0 text-gray-500">Ngày chốt sao kê</dt>
            <dd className="max-w-[11rem] text-right font-semibold text-gray-900">
              Ngày {card.statementDay ?? 1}
            </dd>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <dt className="min-w-0 text-gray-500">Hạn thanh toán</dt>
            <dd className="max-w-[11rem] text-right font-semibold text-red-600">
              +{card.paymentDueDays ?? 15} ngày
            </dd>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <dt className="min-w-0 text-gray-500">Trạng thái thẻ</dt>
            <dd className="max-w-[11rem] text-right font-semibold text-gray-900">
              {card.active === false ? "Ngưng dùng" : "Đang dùng"}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
          <span className="text-sm font-semibold text-gray-600">Thanh toán theo từng kỳ sao kê</span>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`/cards/${card._id}`}
              aria-label={`Mở chi tiết ${displayName}`}
              className="rounded-md px-2 py-1.5 text-sm font-semibold text-blue-700 outline-none hover:bg-blue-50 focus:ring-2 focus:ring-blue-500"
            >
              Chi tiết
            </Link>
            <button
              type="button"
              aria-label={`Xóa ${displayName}`}
              disabled={busy}
              onClick={() => onDelete(card)}
              className="rounded-md p-2 text-gray-500 outline-none hover:bg-red-50 hover:text-red-700 focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
