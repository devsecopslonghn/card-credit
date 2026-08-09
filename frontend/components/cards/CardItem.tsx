"use client";

import Link from "next/link";
import { CardImage } from "@/components/cards/CardImage";
import {
  formatDateDisplay,
  formatVnd,
  getDisplayName,
  getNetwork,
  getProviderName,
  isLegacyCard,
  type CardSummaryView,
  type CreditCardView,
} from "@/components/cards/cardTypes";

type CardItemProps = {
  card: CreditCardView;
  summary: CardSummaryView;
  statementsAvailable: boolean;
  busy: boolean;
  onDelete: (card: CreditCardView) => void;
};

export function CardItem({ card, summary, statementsAvailable, busy, onDelete }: CardItemProps) {
  const displayName = getDisplayName(card);
  const providerName = getProviderName(card);
  const network = getNetwork(card);
  const legacy = isLegacyCard(card);

  return (
    <article className="cc-section flex min-w-0 h-full flex-col overflow-hidden rounded-xl transition-shadow hover:shadow-md">
      <Link href={`/cards/${card._id}`} className="block outline-none focus:ring-2 focus:ring-blue-500">
        <div className="relative flex aspect-[1.58/1] max-h-48 w-full items-center justify-center overflow-hidden bg-gray-50 p-4">
          <CardImage
            src={card.imageUrl}
            alt={`${providerName} ${displayName}`}
            sizes="(max-width: 640px) 100vw, 320px"
            className="h-full max-h-full w-full max-w-full object-contain"
          />
          <div className="cc-badge absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm">
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
          <p className="truncate text-sm font-semibold cc-text-muted">{providerName}</p>
          <h3
            className="line-clamp-3 break-words text-base font-bold leading-snug cc-text-primary"
            title={displayName}
          >
            {displayName}
          </h3>
          <p className="mt-1 break-words text-xs font-medium text-blue-700">Thẻ của: {card.owner || "Tôi"}</p>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <dt className="min-w-0 font-medium cc-text-muted">Ngày chốt sao kê</dt>
            <dd className="max-w-[11rem] text-right font-bold cc-text-primary">
              {formatDateDisplay(summary.statementDate)}
            </dd>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <dt className="min-w-0 font-medium cc-text-muted">Hạn thanh toán</dt>
            <dd className="max-w-[11rem] text-right font-bold cc-text-primary">
              {formatDateDisplay(summary.paymentDueDate)}
            </dd>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <dt className="min-w-0 font-medium cc-text-muted">Dư nợ hiện tại</dt>
            <dd className="max-w-[11rem] text-right font-bold cc-danger">
              {statementsAvailable ? formatVnd(summary.currentOutstandingBalance) : "--"}
            </dd>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <dt className="min-w-0 font-medium cc-text-muted">Cần trả kỳ sao kê</dt>
            <dd className="max-w-[11rem] text-right font-bold cc-danger">
              {statementsAvailable ? formatVnd(summary.statementAmountDue) : "--"}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-2 border-t cc-border pt-4">
          <span className="text-sm font-semibold cc-text-muted">Thanh toán theo từng kỳ sao kê</span>

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
              className="rounded-md p-2 cc-text-muted outline-none hover:bg-red-50 hover:text-danger focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
