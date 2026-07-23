"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateDisplay, formatVnd } from "./cardTypes";
import {
  deleteCardFeePayment,
  fetchCardFeePayments,
  saveCardFeePayment,
  type CardFeePaymentForm,
  type CardFeePaymentRecord,
} from "@/lib/api/cardFeePaymentsClient";
import {
  cardFeePaymentFormFromRecord,
  emptyCardFeePaymentForm,
} from "@/lib/api/cardFeePaymentsCore.mjs";

export function CardFeePaymentSection({ cardId }: { cardId: string }) {
  const [form, setForm] = useState<CardFeePaymentForm>(() =>
    emptyCardFeePaymentForm(),
  );
  const [records, setRecords] = useState<CardFeePaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRecords(await fetchCardFeePayments(cardId));
    } catch (loadError) {
      setRecords([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải phí thẻ đã đóng.",
      );
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadRecords(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRecords]);

  const updateForm = <Key extends keyof CardFeePaymentForm>(
    key: Key,
    value: CardFeePaymentForm[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const resetForm = () => {
    setForm(emptyCardFeePaymentForm());
    setError("");
    setSuccess("");
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const saved = await saveCardFeePayment(cardId, form);
      await loadRecords();
      setForm(emptyCardFeePaymentForm());
      setSuccess(
        `Đã lưu phí ${formatVnd(saved.amount)} ngày ${formatDateDisplay(saved.paymentDate)}.`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Không thể lưu phí thẻ.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (record: CardFeePaymentRecord) => {
    if (
      !window.confirm(
        `Xóa khoản phí ${formatVnd(record.amount)} ngày ${formatDateDisplay(record.paymentDate)}?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await deleteCardFeePayment(cardId, record._id);
      await loadRecords();
      if (form.id === record._id) setForm(emptyCardFeePaymentForm());
      setSuccess("Đã xóa phí thẻ.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Không thể xóa phí thẻ.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="cc-section mb-8 p-6" aria-labelledby="card-fee-title">
      <div className="mb-5">
        <h2 id="card-fee-title" className="text-xl font-bold cc-text">
          Phí thẻ đã đóng
        </h2>
        <p className="mt-2 max-w-4xl text-sm cc-text-muted">
          Chỉ nhập khi ngân hàng thực sự thu phí, ví dụ phí thường niên hoặc phí
          quản lý theo quý. Được miễn hoặc chưa bị thu thì không cần nhập; không
          cần khai báo chu kỳ.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <label className="block text-sm font-semibold cc-text-muted">
          <span className="mb-1 block">Ngày đóng phí</span>
          <input
            type="date"
            required
            value={form.paymentDate}
            onChange={(event) => updateForm("paymentDate", event.target.value)}
            className="cc-control w-full rounded-lg px-3 py-2"
          />
        </label>
        <label className="block text-sm font-semibold cc-text-muted">
          <span className="mb-1 block">Số tiền thực trả</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={form.amount}
            onChange={(event) => updateForm("amount", event.target.value)}
            className="cc-control w-full rounded-lg px-3 py-2 text-right"
          />
        </label>
        <label className="block text-sm font-semibold cc-text-muted md:col-span-2">
          <span className="mb-1 block">Ghi chú</span>
          <input
            value={form.note}
            maxLength={1000}
            onChange={(event) => updateForm("note", event.target.value)}
            placeholder="Ví dụ: Phí thường niên hoặc phí quản lý quý 3"
            className="cc-control w-full rounded-lg px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Đang lưu..." : form.id ? "Cập nhật phí thẻ" : "Lưu phí thẻ"}
          </button>
          {form.id && (
            <button
              type="button"
              disabled={busy}
              onClick={resetForm}
              className="rounded-lg border px-4 py-2 text-sm font-semibold cc-text-muted disabled:opacity-60"
              style={{ borderColor: "var(--border)" }}
            >
              Hủy sửa
            </button>
          )}
        </div>
      </form>

      {error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void loadRecords()} className="underline">Thử lại</button>
        </div>
      )}
      {success && <p role="status" className="mt-4 text-sm font-semibold text-emerald-700">{success}</p>}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold cc-text">Lịch sử phí đã đóng</h3>
          <span className="text-xs cc-text-muted">Mới nhất trước</span>
        </div>
        {loading ? (
          <StateText text="Đang tải lịch sử phí..." />
        ) : records.length === 0 ? (
          <StateText text="Chưa có khoản phí thẻ nào đã đóng." />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border md:block" style={{ borderColor: "var(--border)" }}>
              <table className="w-full border-collapse text-sm">
                <thead className="cc-panel text-left"><tr><th className="p-3">Ngày đóng</th><th className="p-3 text-right">Số tiền</th><th className="p-3">Ghi chú</th><th className="p-3 text-right">Thao tác</th></tr></thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record._id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="p-3 font-semibold">{formatDateDisplay(record.paymentDate)}</td>
                      <td className="p-3 text-right font-semibold cc-tabular">{formatVnd(record.amount)}</td>
                      <td className="max-w-lg break-words p-3">{record.note || "—"}</td>
                      <td className="p-3 text-right"><Actions busy={busy} record={record} onEdit={(item) => { setForm(cardFeePaymentFormFromRecord(item)); setError(""); setSuccess(""); }} onDelete={handleDelete} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {records.map((record) => (
                <article key={record._id} className="cc-panel rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3"><div><h4 className="font-bold cc-text">{formatDateDisplay(record.paymentDate)}</h4><p className="mt-1 break-words text-sm cc-text-muted">{record.note || "Không có ghi chú"}</p></div><p className="font-bold cc-tabular text-red-700">{formatVnd(record.amount)}</p></div>
                  <div className="mt-4 flex justify-end"><Actions busy={busy} record={record} onEdit={(item) => { setForm(cardFeePaymentFormFromRecord(item)); setError(""); setSuccess(""); }} onDelete={handleDelete} /></div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StateText({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-5 text-center cc-text-muted" style={{ borderColor: "var(--border)" }}>{text}</p>;
}

function Actions({ busy, record, onEdit, onDelete }: { busy: boolean; record: CardFeePaymentRecord; onEdit: (record: CardFeePaymentRecord) => void; onDelete: (record: CardFeePaymentRecord) => void }) {
  return <div className="inline-flex gap-2"><button type="button" disabled={busy} onClick={() => onEdit(record)} className="rounded border px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-60">Sửa</button><button type="button" disabled={busy} onClick={() => void onDelete(record)} className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60">Xóa</button></div>;
}
