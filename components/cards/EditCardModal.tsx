"use client";

import { useEffect, useMemo, useState } from "react";
import { OwnerField } from "@/components/cards/OwnerField";
import {
  formatAnnualFee,
  getDisplayName,
  getNetwork,
  getProviderName,
  normalizeOwnerInput,
  validateOwnerInput,
  type CreditCardView,
} from "@/components/cards/cardTypes";

type EditCardModalProps = {
  card: CreditCardView | null;
  ownerOptions: string[];
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: {
    owner: string;
    targetSpendForWaiver: number;
    statementDate: string;
    paymentDueDate: string;
    amountDueThisMonth: number;
  }) => void;
};

export function EditCardModal({ card, ownerOptions, submitting, error, onClose, onSubmit }: EditCardModalProps) {
  const [owner, setOwner] = useState(card?.owner || "Tôi");
  const [ownerError, setOwnerError] = useState("");
  const [targetSpendForWaiver, setTargetSpendForWaiver] = useState(String(card?.targetSpendForWaiver ?? 0));
  const [statementDate, setStatementDate] = useState(card?.statementDate || "");
  const [paymentDueDate, setPaymentDueDate] = useState(card?.paymentDueDate || "");
  const [amountDueThisMonth, setAmountDueThisMonth] = useState(String(card?.amountDueThisMonth ?? 0));

  useEffect(() => {
    if (!card) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [card, onClose, submitting]);

  const title = useMemo(() => (card ? getDisplayName(card) : ""), [card]);

  if (!card) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const ownerValidation = validateOwnerInput(owner);
    setOwner(ownerValidation.owner);
    setOwnerError(ownerValidation.message);
    if (!ownerValidation.valid) return;

    onSubmit({
      owner: ownerValidation.owner,
      targetSpendForWaiver: Number(targetSpendForWaiver) || 0,
      statementDate,
      paymentDueDate,
      amountDueThisMonth: Number(amountDueThisMonth) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="edit-card-title" className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 id="edit-card-title" className="text-lg font-bold text-gray-900">
              Sửa thông tin vận hành
            </h3>
            <p className="text-sm text-gray-500">
              {getProviderName(card)} · {title} · {getNetwork(card)}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-500">Phí thường niên snapshot: {formatAnnualFee(card.annualFee)}</p>
          </div>
          <button
            type="button"
            aria-label="Đóng modal sửa thẻ"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-gray-500 outline-none hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <OwnerField
            value={owner}
            error={ownerError}
            ownerOptions={ownerOptions}
            disabled={submitting}
            onChange={(value) => {
              setOwner(value);
              if (ownerError) setOwnerError(validateOwnerInput(value).message);
            }}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="target-spend" className="block text-sm font-semibold text-gray-900 mb-1">
                Doanh số miễn phí
              </label>
              <input
                id="target-spend"
                type="number"
                value={targetSpendForWaiver}
                disabled={submitting}
                onChange={(event) => setTargetSpendForWaiver(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="amount-due" className="block text-sm font-semibold text-gray-900 mb-1">
                Tiền thanh toán tháng này
              </label>
              <input
                id="amount-due"
                type="number"
                value={amountDueThisMonth}
                disabled={submitting}
                onChange={(event) => setAmountDueThisMonth(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="statement-date" className="block text-sm font-semibold text-gray-900 mb-1">
                Ngày sao kê
              </label>
              <input
                id="statement-date"
                type="date"
                value={statementDate}
                disabled={submitting}
                onChange={(event) => setStatementDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="payment-due-date" className="block text-sm font-semibold text-gray-900 mb-1">
                Hạn thanh toán
              </label>
              <input
                id="payment-due-date"
                type="date"
                value={paymentDueDate}
                disabled={submitting}
                onChange={(event) => setPaymentDueDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-5 py-2.5 font-medium text-gray-800 outline-none hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              onClick={() => setOwner(normalizeOwnerInput(owner))}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white outline-none hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              {submitting ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
