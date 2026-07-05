"use client";

import { CardItem } from "@/components/cards/CardItem";
import type { CreditCardView, ProviderGroup } from "@/components/cards/cardTypes";

type ProviderSectionProps = {
  group: ProviderGroup;
  busyCardId: string;
  onEdit: (card: CreditCardView) => void;
  onDelete: (card: CreditCardView) => void;
  onTogglePaid: (card: CreditCardView, checked: boolean) => void;
};

export function ProviderSection({ group, busyCardId, onEdit, onDelete, onTogglePaid }: ProviderSectionProps) {
  return (
    <section aria-labelledby={`provider-${group.providerKey}`} className="mb-8">
      <h2 id={`provider-${group.providerKey}`} className="mb-3 text-xl font-bold text-gray-900">
        {group.providerName} <span className="text-sm font-semibold text-gray-500">({group.cards.length})</span>
      </h2>
      <div className="flex flex-wrap items-stretch gap-4">
        {group.cards.map((card) => (
          <CardItem
            key={card._id}
            card={card}
            busy={busyCardId === card._id}
            onEdit={onEdit}
            onDelete={onDelete}
            onTogglePaid={onTogglePaid}
          />
        ))}
      </div>
    </section>
  );
}
