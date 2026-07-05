"use client";

import {
  formatDateDisplay,
  formatVnd,
  getDisplayName,
  getProviderName,
  type CreditCardView,
} from "@/components/cards/cardTypes";

type UpcomingPaymentsProps = {
  cards: CreditCardView[];
  selectedOwner: string;
};

export function UpcomingPayments({ cards, selectedOwner }: UpcomingPaymentsProps) {
  if (cards.length === 0) return null;

  return (
    <section className="mb-8 rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm" aria-labelledby="upcoming-payments-title">
      <h2 id="upcoming-payments-title" className="mb-4 text-lg font-bold text-orange-800">
        Danh sách thẻ sắp đến hạn {selectedOwner && `của [${selectedOwner}]`}
      </h2>
      <div className="flex flex-wrap gap-4">
        {cards.map((card) => (
          <div
            key={card._id}
            className="flex min-w-0 flex-1 basis-full items-center justify-between rounded-xl border border-orange-100 bg-white p-4 shadow-sm sm:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.75rem)]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">{getDisplayName(card)}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">{getProviderName(card)}</span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                  Thẻ: {card.owner || "Tôi"}
                </span>
              </div>
            </div>
            <div className="ml-3 shrink-0 text-right">
              <p className="font-bold text-red-600">{formatDateDisplay(card.paymentDueDate)}</p>
              <p className="text-xs font-bold text-gray-900">{formatVnd(card.amountDueThisMonth)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
