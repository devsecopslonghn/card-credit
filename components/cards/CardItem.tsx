"use client";

import Link from "next/link";
import {
  CARD_IMAGE_PLACEHOLDER_URL,
  formatAnnualFee,
  formatDateDisplay,
  formatVnd,
  getDisplayName,
  getNetwork,
  getProviderName,
  isLegacyCard,
  type CreditCardView,
} from "@/components/cards/cardTypes";

type CardItemProps = {
  card: CreditCardView;
  busy: boolean;
  onEdit: (card: CreditCardView) => void;
  onDelete: (card: CreditCardView) => void;
  onTogglePaid: (card: CreditCardView, checked: boolean) => void;
};

export function CardItem({ card, busy, onEdit, onDelete, onTogglePaid }: CardItemProps) {
  const displayName = getDisplayName(card);
  const providerName = getProviderName(card);
  const network = getNetwork(card);
  const legacy = isLegacyCard(card);

  return (
    <article className="flex min-w-0 flex-1 basis-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.75rem)] xl:basis-[calc(25%-0.75rem)]">
      <Link href={`/cards/${card._id}`} className="block outline-none focus:ring-2 focus:ring-blue-500">
        <div className="relative aspect-[16/10] bg-gray-100">
          <img
            src={card.imageUrl || CARD_IMAGE_PLACEHOLDER_URL}
            alt={`${providerName} ${displayName}`}
            className="h-full w-full object-contain"
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
          <h3 className="break-words text-base font-bold leading-snug text-gray-900">{displayName}</h3>
          <p className="mt-1 text-xs font-semibold text-blue-700">Thẻ của: {card.owner || "Tôi"}</p>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Phí thường niên</dt>
            <dd className="text-right font-semibold text-gray-900">{formatAnnualFee(card.annualFee)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Ngày sao kê</dt>
            <dd className="text-right font-semibold text-gray-900">{formatDateDisplay(card.statementDate)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Hạn thanh toán</dt>
            <dd className="text-right font-semibold text-red-600">{formatDateDisplay(card.paymentDueDate)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Cần thanh toán</dt>
            <dd className="text-right font-semibold text-gray-900">{formatVnd(card.amountDueThisMonth)}</dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
          <label className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              aria-label={`${card.isPaidThisMonth ? "Bỏ đánh dấu đã thanh toán" : "Đánh dấu đã thanh toán"} ${displayName}`}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={Boolean(card.isPaidThisMonth)}
              disabled={busy}
              onChange={(event) => onTogglePaid(card, event.target.checked)}
            />
            <span className={card.isPaidThisMonth ? "text-emerald-600 line-through" : ""}>
              <span aria-hidden="true">{card.isPaidThisMonth ? "✓ " : "! "}</span>
              {card.isPaidThisMonth ? "Đã thanh toán" : "Chưa thanh toán"}
            </span>
          </label>

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
              aria-label={`Sửa ${displayName}`}
              disabled={busy}
              onClick={() => onEdit(card)}
              className="rounded-md p-2 text-gray-500 outline-none hover:bg-blue-50 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              ✎
            </button>
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
