"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { OwnerField } from "@/components/cards/OwnerField";
import {
  CARD_IMAGE_PLACEHOLDER_URL,
  buildOperationalUpdatePayload,
  calculateCardMetrics,
  calculateMonthNet,
  formatAnnualFee,
  formatDateDisplay,
  formatVnd,
  getDisplayName,
  getMonthlyData,
  getNetwork,
  getProviderName,
  isLegacyCard,
  type CreditCardView,
  type MonthlyData,
  validateOwnerInput,
} from "@/components/cards/cardTypes";
import { fetchCards, updateCardOperational } from "@/lib/api/cardsClient";

type GeneralForm = {
  owner: string;
  targetSpendForWaiver: number | "";
  statementDate: string;
  paymentDueDate: string;
  amountDueThisMonth: number | "";
  isPaidThisMonth: boolean;
};

type Toast = { message: string; type: "success" | "error" };

const monthLabel = (month: number) => `Tháng ${month}`;

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [card, setCard] = useState<CreditCardView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [generalData, setGeneralData] = useState<GeneralForm>({
    owner: "Tôi",
    targetSpendForWaiver: 0,
    statementDate: "",
    paymentDueDate: "",
    amountDueThisMonth: 0,
    isPaidThisMonth: false,
  });
  const [editingMonth, setEditingMonth] = useState<MonthlyData | null>(null);
  const [monthError, setMonthError] = useState("");

  const loadCardDetails = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const cards = await fetchCards();
      const currentCard = cards.find((item) => item._id === resolvedParams.id) ?? null;
      if (!currentCard) setLoadError("Không tìm thấy thẻ.");
      setCard(currentCard);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không thể tải dữ liệu thẻ.");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadCardDetails(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadCardDetails]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const metrics = useMemo(() => (card ? calculateCardMetrics(card) : null), [card]);
  const monthlyData = useMemo(() => (card ? getMonthlyData(card) : []), [card]);

  const openGeneralEdit = () => {
    if (!card) return;
    setGeneralData({
      owner: card.owner || "Tôi",
      targetSpendForWaiver: card.targetSpendForWaiver ?? 0,
      statementDate: card.statementDate || "",
      paymentDueDate: card.paymentDueDate || "",
      amountDueThisMonth: card.amountDueThisMonth ?? 0,
      isPaidThisMonth: Boolean(card.isPaidThisMonth),
    });
    setOwnerError("");
    setGeneralError("");
    setIsGeneralModalOpen(true);
  };

  const handleSaveGeneral = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!card) return;

    const ownerValidation = validateOwnerInput(generalData.owner);
    setGeneralData((current) => ({ ...current, owner: ownerValidation.owner }));
    setOwnerError(ownerValidation.message);
    if (!ownerValidation.valid) return;

    setIsSubmitting(true);
    setGeneralError("");
    try {
      const payload = buildOperationalUpdatePayload({
        owner: ownerValidation.owner,
        targetSpendForWaiver: generalData.targetSpendForWaiver,
        statementDate: generalData.statementDate,
        paymentDueDate: generalData.paymentDueDate,
        amountDueThisMonth: generalData.amountDueThisMonth,
        isPaidThisMonth: generalData.isPaidThisMonth,
      });
      const updatedCard = await updateCardOperational(card._id, payload);
      setCard(updatedCard);
      setIsGeneralModalOpen(false);
      showToast("Cập nhật thông tin vận hành thành công.");
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : "Không thể lưu thông tin vận hành.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMonthEditModal = (monthData: MonthlyData) => {
    setEditingMonth({ ...monthData });
    setMonthError("");
  };

  const handleSaveMonth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!card || !editingMonth) return;

    const payloadMonth = {
      month: editingMonth.month,
      spend: Number(editingMonth.spend) || 0,
      cashback: Number(editingMonth.cashback) || 0,
      fee: Number(editingMonth.fee) || 0,
      otherInterest: Number(editingMonth.otherInterest) || 0,
    };

    const updatedMonthlyData = monthlyData.map((month) => (month.month === payloadMonth.month ? payloadMonth : month));

    setIsSubmitting(true);
    setMonthError("");
    try {
      const updatedCard = await updateCardOperational(card._id, buildOperationalUpdatePayload({ monthlyData: updatedMonthlyData }));
      setCard(updatedCard);
      setEditingMonth(null);
      showToast(`Cập nhật dữ liệu ${monthLabel(payloadMonth.month)} thành công.`);
    } catch (error) {
      setMonthError(error instanceof Error ? error.message : "Không thể lưu dữ liệu tháng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen p-10 text-center text-gray-500">Đang tải dữ liệu thẻ...</div>;
  }

  if (loadError || !card || !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-700">{loadError || "Không tìm thấy thẻ."}</p>
          <button type="button" onClick={loadCardDetails} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  const providerName = getProviderName(card);
  const displayName = getDisplayName(card);
  const network = getNetwork(card);
  const legacy = isLegacyCard(card);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 md:px-8">
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl px-5 py-3.5 font-medium text-white shadow-2xl ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          <span aria-hidden="true">{toast.type === "success" ? "✓" : "!"}</span>
          <span className="break-words">{toast.message}</span>
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        <Link href="/cards" className="mb-6 inline-flex items-center gap-2 font-medium text-blue-600 hover:underline">
          &larr; Quay lại danh sách thẻ
        </Link>

        <section className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm" aria-labelledby="card-detail-title">
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-100 pb-4 md:flex-row md:items-center">
            <div>
              <h1 id="card-detail-title" className="text-2xl font-bold text-gray-900">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {providerName} · {network} · Thẻ của {card.owner || "Tôi"}
              </p>
            </div>
            <button
              type="button"
              onClick={openGeneralEdit}
              className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 outline-none hover:bg-blue-100 focus:ring-2 focus:ring-blue-500"
            >
              Sửa thông tin vận hành
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-4">
              <img
                src={card.imageUrl || CARD_IMAGE_PLACEHOLDER_URL}
                alt={`${providerName} ${displayName}`}
                className="mb-3 h-28 w-full object-contain"
                onError={(event) => {
                  event.currentTarget.src = CARD_IMAGE_PLACEHOLDER_URL;
                }}
              />
              <p className="text-sm font-semibold text-gray-500">{providerName}</p>
              <h2 className="text-center text-lg font-bold text-gray-900">{displayName}</h2>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">{network}</span>
                {legacy && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Legacy</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-3 lg:grid-cols-3">
              <StatBox label="Provider" value={providerName} />
              <StatBox label="Card Product" value={displayName} />
              <StatBox label="Network" value={network} />
              <StatBox label="Chủ thẻ" value={card.owner || "Tôi"} />
              <StatBox label="Phí thường niên snapshot" value={formatAnnualFee(card.annualFee)} />
              <StatBox label="Doanh số miễn PTN" value={formatVnd(metrics.targetSpendForWaiver)} />
              <StatBox label="Cần chi tiêu thêm" value={formatVnd(metrics.remainingSpend)} color="text-orange-500" />
              <StatBox label="Ngày sao kê" value={formatDateDisplay(card.statementDate)} />
              <StatBox label="Hạn thanh toán" value={formatDateDisplay(card.paymentDueDate)} color="text-red-600" />
              <StatBox label="Tiền thanh toán tháng này" value={formatVnd(card.amountDueThisMonth)} color="text-red-600" />
              <StatBox label="Trạng thái thanh toán" value={card.isPaidThisMonth ? "Đã thanh toán" : "Chưa thanh toán"} />
              <StatBox label="Tổng chi tiêu lũy kế" value={formatVnd(metrics.totalSpend)} color="text-blue-600" />
              <StatBox label="Tổng tiền hoàn" value={formatVnd(metrics.totalCashback)} color="text-emerald-600" />
              <StatBox label="Tổng phụ phí quẹt thẻ" value={formatVnd(metrics.totalFee)} color="text-red-500" />
              <StatBox label="Tổng lãi gửi ngắn hạn" value={formatVnd(metrics.totalOtherInterest)} color="text-emerald-600" />
              <div className="rounded-xl border border-gray-200 bg-gray-900 p-4 text-white sm:col-span-2 lg:col-span-3">
                <p className="mb-1 text-sm font-medium text-gray-300">Tổng kết thúc (Lãi/Lỗ ròng)</p>
                <p className={`text-2xl font-bold ${metrics.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {metrics.netProfit > 0 ? "+" : ""}
                  {formatVnd(metrics.netProfit)}
                </p>
                {!metrics.annualFeeKnown && (
                  <p className="mt-2 text-xs text-gray-300">Phí thường niên chưa xác định được tính là 0 chỉ cho phép tính tổng.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" aria-labelledby="monthly-detail-title">
          <div className="border-b border-gray-100 p-6">
            <h2 id="monthly-detail-title" className="text-xl font-bold text-gray-900">
              Chi tiết 12 tháng
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-500">
                  <th className="w-32 p-4 text-center">Tháng</th>
                  <th className="p-4">Chi tiêu</th>
                  <th className="p-4">Tiền hoàn</th>
                  <th className="p-4">Phụ phí</th>
                  <th className="p-4">Lãi khác</th>
                  <th className="p-4">Tổng số kết thúc</th>
                  <th className="w-24 p-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((month) => {
                  const monthEnd = calculateMonthNet(month);
                  return (
                    <tr key={month.month} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="min-w-28 p-4 text-center font-bold text-gray-900">{monthLabel(month.month)}</td>
                      <td className="p-4 font-medium text-gray-700">{formatVnd(month.spend)}</td>
                      <td className="p-4 font-medium text-emerald-600">{formatVnd(month.cashback)}</td>
                      <td className="p-4 font-medium text-red-500">{formatVnd(month.fee)}</td>
                      <td className="p-4 font-medium text-emerald-600">{formatVnd(month.otherInterest)}</td>
                      <td className={`p-4 font-bold ${monthEnd >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {monthEnd > 0 ? "+" : ""}
                        {formatVnd(monthEnd)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => openMonthEditModal(month)}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100"
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {isGeneralModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="general-edit-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-6 py-4">
                <div>
                  <h3 id="general-edit-title" className="text-lg font-bold text-gray-900">
                    Sửa thông tin vận hành
                  </h3>
                  <p className="text-sm text-gray-500">Product identity là read-only: {providerName} · {displayName} · {network}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGeneralModalOpen(false)}
                  aria-label="Đóng modal sửa thông tin vận hành"
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                  x
                </button>
              </div>
              <form onSubmit={handleSaveGeneral} className="space-y-4 p-6">
                <OwnerField
                  value={generalData.owner}
                  error={ownerError}
                  disabled={isSubmitting}
                  onChange={(value) => {
                    setGeneralData((current) => ({ ...current, owner: value }));
                    if (ownerError) setOwnerError(validateOwnerInput(value).message);
                  }}
                />
                <InputNumberField
                  label="Doanh số miễn phí thường niên (VNĐ)"
                  value={generalData.targetSpendForWaiver}
                  onChange={(value) => setGeneralData((current) => ({ ...current, targetSpendForWaiver: value }))}
                  disabled={isSubmitting}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DateField
                    id="statement-date"
                    label="Ngày sao kê"
                    value={generalData.statementDate}
                    disabled={isSubmitting}
                    onChange={(value) => setGeneralData((current) => ({ ...current, statementDate: value }))}
                  />
                  <DateField
                    id="payment-due-date"
                    label="Hạn thanh toán"
                    value={generalData.paymentDueDate}
                    disabled={isSubmitting}
                    onChange={(value) => setGeneralData((current) => ({ ...current, paymentDueDate: value }))}
                  />
                </div>
                <InputNumberField
                  label="Tiền thanh toán tháng này (VNĐ)"
                  value={generalData.amountDueThisMonth}
                  onChange={(value) => setGeneralData((current) => ({ ...current, amountDueThisMonth: value }))}
                  disabled={isSubmitting}
                />
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={generalData.isPaidThisMonth}
                    disabled={isSubmitting}
                    onChange={(event) => setGeneralData((current) => ({ ...current, isPaidThisMonth: event.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Đã thanh toán tháng này
                </label>
                {generalError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{generalError}</p>}
                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                  <button type="button" onClick={() => setIsGeneralModalOpen(false)} className="rounded-lg px-5 py-2.5 font-medium text-gray-900 hover:bg-gray-100">
                    Hủy
                  </button>
                  <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                    {isSubmitting ? "Đang lưu..." : "Cập nhật"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingMonth && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="month-edit-title" className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h3 id="month-edit-title" className="text-lg font-bold text-gray-900">
                  Cập nhật dữ liệu {monthLabel(editingMonth.month)}
                </h3>
                <button type="button" onClick={() => setEditingMonth(null)} aria-label="Đóng modal sửa tháng" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                  x
                </button>
              </div>
              <form onSubmit={handleSaveMonth} className="space-y-4 p-6">
                <InputNumberField label="Chi tiêu (VNĐ)" value={editingMonth.spend ?? 0} disabled={isSubmitting} onChange={(value) => setEditingMonth({ ...editingMonth, spend: Number(value) || 0 })} />
                <InputNumberField label="Tiền hoàn (VNĐ)" value={editingMonth.cashback ?? 0} disabled={isSubmitting} onChange={(value) => setEditingMonth({ ...editingMonth, cashback: Number(value) || 0 })} />
                <InputNumberField label="Phụ phí" value={editingMonth.fee ?? 0} disabled={isSubmitting} onChange={(value) => setEditingMonth({ ...editingMonth, fee: Number(value) || 0 })} />
                <InputNumberField label="Các lãi khác" value={editingMonth.otherInterest ?? 0} disabled={isSubmitting} onChange={(value) => setEditingMonth({ ...editingMonth, otherInterest: Number(value) || 0 })} />
                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="font-semibold text-gray-700">Tổng kết thúc tháng</span>
                  <span className={`text-lg font-bold ${calculateMonthNet(editingMonth) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {formatVnd(calculateMonthNet(editingMonth))}
                  </span>
                </div>
                {monthError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{monthError}</p>}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingMonth(null)} className="rounded-lg px-5 py-2.5 font-medium text-gray-900 hover:bg-gray-100">
                    Hủy
                  </button>
                  <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                    {isSubmitting ? "Đang lưu..." : "Lưu tháng"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type StatBoxProps = {
  label: string;
  value: string;
  color?: string;
};

function StatBox({ label, value, color = "text-gray-900" }: StatBoxProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      <p className={`break-words text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

type DateFieldProps = {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function DateField({ id, label, value, disabled, onChange }: DateFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-900">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white p-2.5 font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />
    </div>
  );
}

type InputNumberFieldProps = {
  label: string;
  value: number | "";
  disabled?: boolean;
  onChange: (value: number | "") => void;
};

function InputNumberField({ label, value, disabled = false, onChange }: InputNumberFieldProps) {
  const displayValue = value === "" ? "" : Number(value || 0).toLocaleString("vi-VN");

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-900">{label}</label>
      <input
        required
        type="text"
        value={displayValue}
        disabled={disabled}
        onChange={(event) => {
          const rawValue = event.target.value.replace(/\D/g, "");
          onChange(rawValue === "" ? "" : Number(rawValue));
        }}
        onBlur={() => {
          if (value === "") onChange(0);
        }}
        placeholder="0"
        className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-right font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />
    </div>
  );
}
