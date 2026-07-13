"use client";

import { CardItem } from "@/components/cards/CardItem";
import type { CardSummaryView, CreditCardView, ProviderGroup } from "@/components/cards/cardTypes";

type ProviderSectionProps = {
  group: ProviderGroup;
  cardSummaries: Record<string, CardSummaryView>;
  statementsAvailable: boolean;
  busyCardId: string;
  onDelete: (card: CreditCardView) => void;
};

export function ProviderSection({ group, cardSummaries, statementsAvailable, busyCardId, onDelete }: ProviderSectionProps) {
  return (
    <section aria-labelledby={`provider-${group.providerKey}`} className="mb-8 min-w-0">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3 border-b border-gray-200 pb-2">
        <h2 id={`provider-${group.providerKey}`} className="min-w-0 break-words text-xl font-bold text-gray-900">
          {group.providerName}
        </h2>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
          {group.cards.length} thẻ
        </span>
      </div>
      <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {group.cards.map((card) => (
          <CardItem
            key={card._id}
            card={card}
            summary={cardSummaries[card._id]}
            statementsAvailable={statementsAvailable}
            busy={busyCardId === card._id}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
