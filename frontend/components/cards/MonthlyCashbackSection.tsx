"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateDisplay, formatVnd } from "./cardTypes";
import {
  deleteMonthlyCashback,
  fetchMonthlyCashbacks,
  upsertMonthlyCashback,
  type MonthlyCashbackForm,
  type MonthlyCashbackRecord,
  type MonthlyCashbackStatus,
} from "@/lib/api/monthlyCashbacksClient";
import {
  currentPeriod,
  emptyMonthlyCashbackForm,
  monthlyCashbackFormFromRecord,
} from "@/lib/api/monthlyCashbacksCore.mjs";

const statusLabels: Record<MonthlyCashbackStatus, string> = {
  PENDING: "Chờ nhận",
  RECEIVED: "Đã nhận",
  REJECTED: "Bị từ chối",
};

const periodLabel = (period: string) => {
  const [year, month] = period.split("-");
  return `Tháng ${month}/${year}`;
};

export function MonthlyCashbackSection({ cardId }: { cardId: string }) {
  const initialPeriod = currentPeriod();
  const [form, setForm] = useState<MonthlyCashbackForm>(() =>
    emptyMonthlyCashbackForm(initialPeriod),
  );
  const [year, setYear] = useState(initialPeriod.slice(0, 4));
  const [records, setRecords] = useState<MonthlyCashbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRecords(await fetchMonthlyCashbacks(cardId, year));
    } catch (loadError) {
      setRecords([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải cashback ngân hàng.",
      );
    } finally {
      setLoading(false);
    }
  }, [cardId, year]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadRecords(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRecords]);

  const updateForm = <Key extends keyof MonthlyCashbackForm>(
    key: Key,
    value: MonthlyCashbackForm[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const handlePeriodChange = (period: string) => {
    updateForm("period", period);
    const nextYear = period.slice(0, 4);
    if (nextYear) setYear(nextYear);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const saved = await upsertMonthlyCashback(cardId, form);
      setForm(monthlyCashbackFormFromRecord(saved));
      await loadRecords();
      setSuccess(`Đã lưu cashback ${periodLabel(saved.period)}.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể lưu cashback ngân hàng.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (record: MonthlyCashbackRecord) => {
    setForm(monthlyCashbackFormFromRecord(record));
    setYear(record.period.slice(0, 4));
    setError("");
    setSuccess("");
  };

  const handleDelete = async (record: MonthlyCashbackRecord) => {
    if (
      !window.confirm(
        `Xóa cashback ngân hàng của ${periodLabel(record.period)}?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await deleteMonthlyCashback(cardId, record.period);
      await loadRecords();
      if (form.period === record.period)
        setForm(emptyMonthlyCashbackForm(record.period));
      setSuccess(`Đã xóa cashback ${periodLabel(record.period)}.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Không thể xóa cashback ngân hàng.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="cc-section mb-8 p-6"
      aria-labelledby="monthly-cashback-title"
    >
      <div className="mb-5">
        <h2 id="monthly-cashback-title" className="text-xl font-bold cc-text">
          Cashback ngân hàng theo tháng
        </h2>
        <p className="mt-2 max-w-4xl text-sm cc-text-muted">
          Đây là khoản ngân hàng trả riêng theo tháng dương lịch. Khoản này không
          làm giảm số tiền phải trả và khác với tiền đối tác hoàn. Cashback ước
          tính theo từng giao dịch bên dưới vẫn được giữ để đối chiếu, không cộng
          trùng.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6"
      >
        <label className="block text-sm font-semibold cc-text-muted">
          <span className="mb-1 block">Tháng</span>
          <input
            type="month"
            required
            value={form.period}
            onChange={(event) => handlePeriodChange(event.target.value)}
            className="cc-control w-full rounded-lg px-3 py-2"
          />
        </label>
        <MoneyField
          label="Cashback dự kiến"
          value={form.expectedAmount}
          required
          onChange={(value) => updateForm("expectedAmount", value)}
        />
        <label className="block text-sm font-semibold cc-text-muted">
          <span className="mb-1 block">Trạng thái</span>
          <select
            value={form.status}
            onChange={(event) => {
              const status = event.target.value as MonthlyCashbackStatus;
              setForm((current) => ({
                ...current,
                status,
                actualAmount:
                  status === "RECEIVED" ? current.actualAmount : "",
              }));
            }}
            className="cc-control w-full rounded-lg px-3 py-2"
          >
            <option value="PENDING">Chờ nhận</option>
            <option value="RECEIVED">Đã nhận</option>
            <option value="REJECTED">Bị từ chối</option>
          </select>
        </label>
        <MoneyField
          label="Cashback thực nhận"
          value={form.actualAmount}
          required={form.status === "RECEIVED"}
          disabled={form.status !== "RECEIVED"}
          onChange={(value) => updateForm("actualAmount", value)}
        />
        <label className="block text-sm font-semibold cc-text-muted xl:col-span-2">
          <span className="mb-1 block">Ghi chú</span>
          <input
            value={form.note}
            maxLength={1000}
            onChange={(event) => updateForm("note", event.target.value)}
            placeholder="Ví dụ: Cashback kỳ tháng 7"
            className="cc-control w-full rounded-lg px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-6">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Đang lưu..." : "Lưu cashback tháng"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const period = currentPeriod();
              setForm(emptyMonthlyCashbackForm(period));
              setYear(period.slice(0, 4));
              setError("");
              setSuccess("");
            }}
            className="rounded-lg border px-4 py-2 text-sm font-semibold cc-text-muted disabled:opacity-60"
            style={{ borderColor: "var(--border)" }}
          >
            Nhập tháng mới
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
        >
          <span>{error}</span>
          <button type="button" onClick={() => void loadRecords()} className="underline">
            Thử lại
          </button>
        </div>
      )}
      {success && (
        <p role="status" className="mt-4 text-sm font-semibold text-emerald-700">
          {success}
        </p>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold cc-text">Lịch sử năm {year}</h3>
          <span className="text-xs cc-text-muted">Mới nhất trước</span>
        </div>
        {loading ? (
          <p className="rounded-lg border border-dashed p-5 text-center cc-text-muted" style={{ borderColor: "var(--border)" }}>
            Đang tải lịch sử cashback...
          </p>
        ) : records.length === 0 ? (
          <p className="rounded-lg border border-dashed p-5 text-center cc-text-muted" style={{ borderColor: "var(--border)" }}>
            Chưa có cashback ngân hàng trong năm này.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border md:block" style={{ borderColor: "var(--border)" }}>
              <table className="w-full border-collapse text-sm">
                <thead className="cc-panel text-left">
                  <tr>
                    <th className="p-3">Tháng</th>
                    <th className="p-3 text-right">Dự kiến</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Thực nhận</th>
                    <th className="p-3">Ghi chú</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record._id} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="p-3 font-semibold">{periodLabel(record.period)}</td>
                      <td className="p-3 text-right cc-tabular">{formatVnd(record.expectedAmount)}</td>
                      <td className="p-3">{statusLabels[record.status]}</td>
                      <td className="p-3 text-right cc-tabular">{record.actualAmount === null ? "—" : formatVnd(record.actualAmount)}</td>
                      <td className="max-w-xs break-words p-3">{record.note || "—"}</td>
                      <td className="whitespace-nowrap p-3 text-right">
                        <ActionButtons busy={busy} record={record} onEdit={handleEdit} onDelete={handleDelete} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {records.map((record) => (
                <article key={record._id} className="cc-panel rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold cc-text">{periodLabel(record.period)}</h4>
                      <p className="mt-1 text-sm cc-text-muted">{statusLabels[record.status]}</p>
                    </div>
                    <p className="font-bold cc-tabular text-emerald-700">
                      {record.actualAmount === null ? "—" : formatVnd(record.actualAmount)}
                    </p>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <dt className="cc-text-muted">Dự kiến</dt>
                    <dd className="text-right font-semibold cc-tabular">{formatVnd(record.expectedAmount)}</dd>
                    <dt className="cc-text-muted">Ngày nhận</dt>
                    <dd className="text-right">{record.receivedAt ? formatDateDisplay(record.receivedAt.slice(0, 10)) : "—"}</dd>
                  </dl>
                  {record.note && <p className="mt-3 break-words text-sm cc-text-muted">{record.note}</p>}
                  <div className="mt-4 flex justify-end">
                    <ActionButtons busy={busy} record={record} onEdit={handleEdit} onDelete={handleDelete} />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function MoneyField({
  label,
  value,
  required = false,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold cc-text-muted">
      <span className="mb-1 block">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        required={required}
        disabled={disabled}
        value={disabled ? "" : value}
        onChange={(event) => onChange(event.target.value)}
        className="cc-control w-full rounded-lg px-3 py-2 text-right disabled:cursor-not-allowed disabled:bg-gray-100"
      />
    </label>
  );
}

function ActionButtons({
  busy,
  record,
  onEdit,
  onDelete,
}: {
  busy: boolean;
  record: MonthlyCashbackRecord;
  onEdit: (record: MonthlyCashbackRecord) => void;
  onDelete: (record: MonthlyCashbackRecord) => void;
}) {
  return (
    <div className="inline-flex gap-2">
      <button type="button" disabled={busy} onClick={() => onEdit(record)} className="rounded px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
        Sửa
      </button>
      <button type="button" disabled={busy} onClick={() => void onDelete(record)} className="rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
        Xóa
      </button>
    </div>
  );
}
