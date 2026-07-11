"use client";

import { useEffect, useState } from "react";
import { getDisplayName, getProviderName, type CreditCardView } from "@/components/cards/cardTypes";
import {
  fetchDuplicateCards,
  mergeDuplicateCards,
  type DuplicateCardGroup,
} from "@/lib/api/cardsClient";

type DuplicateResolverProps = {
  refreshKey: number;
  onMerged: () => void;
  onStatus: (message: string, type?: "success" | "error") => void;
};

const cardLabel = (card: CreditCardView) => `${getProviderName(card)} - ${getDisplayName(card)} - ${card.owner ?? "Chưa rõ chủ thẻ"}`;

export function DuplicateResolver({ refreshKey, onMerged, onStatus }: DuplicateResolverProps) {
  const [groups, setGroups] = useState<DuplicateCardGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadDuplicates = async () => {
      setLoading(true);
      setError("");
      try {
        const nextGroups = await fetchDuplicateCards();
        if (!cancelled) setGroups(nextGroups);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Không thể kiểm tra thẻ trùng.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDuplicates();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleMerge = async (group: DuplicateCardGroup, sourceCard: CreditCardView, targetCard: CreditCardView) => {
    const key = `${sourceCard._id}:${targetCard._id}`;
    setBusyKey(key);
    try {
      await mergeDuplicateCards({ sourceCardId: sourceCard._id, targetCardId: targetCard._id });
      setGroups((current) => current.filter((item) => item.fingerprint !== group.fingerprint));
      onStatus("Đã merge thẻ trùng. Monthly data được cộng vào thẻ giữ lại.");
      onMerged();
    } catch (mergeError) {
      onStatus(mergeError instanceof Error ? mergeError.message : "Không thể merge thẻ trùng.", "error");
    } finally {
      setBusyKey("");
    }
  };

  if (!loading && !error && groups.length === 0) return null;

  return (
    <section aria-labelledby="duplicate-cards-title" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="duplicate-cards-title" className="text-base font-bold text-amber-950">
            Thẻ có khả năng trùng
          </h2>
          <p className="text-sm text-amber-900">
            Exact-match theo workspace, Card Product và owner đã chuẩn hóa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onMerged()}
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
        >
          Tải lại
        </button>
      </div>

      {loading && <p className="mt-3 text-sm text-amber-900">Đang kiểm tra...</p>}
      {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="mt-4 space-y-3">
        {groups.map((group) => {
          const targetCard = group.cards[0];
          const sourceCards = group.cards.slice(1);
          return (
            <div key={group.fingerprint} className="rounded-lg border border-amber-200 bg-white p-3">
              <p className="text-sm font-semibold text-gray-900">
                {group.normalizedOwner} - {group.presetId} ({group.cards.length} bản ghi)
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Giữ lại: <span className="font-medium">{cardLabel(targetCard)}</span>
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {sourceCards.map((sourceCard) => {
                  const key = `${sourceCard._id}:${targetCard._id}`;
                  return (
                    <div key={sourceCard._id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-gray-700">{cardLabel(sourceCard)}</span>
                      <button
                        type="button"
                        disabled={busyKey === key}
                        onClick={() => handleMerge(group, sourceCard, targetCard)}
                        className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-600"
                      >
                        {busyKey === key ? "Đang merge..." : "Merge vào thẻ giữ lại"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
