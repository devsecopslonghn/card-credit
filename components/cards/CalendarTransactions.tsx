"use client";

import { useMemo, useState } from "react";
import { formatDateDisplay, formatVnd } from "@/components/cards/cardTypes";
import type { CardTransactionView } from "@/lib/api/transactionsClient";

type CalendarTransactionsProps = {
  transactions: CardTransactionView[];
  onAdd: (date: string) => void;
  onEdit: (transaction: CardTransactionView) => void;
};

export function CalendarTransactions({ transactions, onAdd, onEdit }: CalendarTransactionsProps) {
  const todayObj = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayObj.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState("");

  const byDate = useMemo(() => {
    const groups = new Map<string, CardTransactionView[]>();
    for (const transaction of transactions) {
      const list = groups.get(transaction.transactionDate) ?? [];
      list.push(transaction);
      groups.set(transaction.transactionDate, list);
    }
    return groups;
  }, [transactions]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const weekdays = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const yearOptions = Array.from({ length: 11 }, (_, index) => todayObj.getFullYear() - 5 + index);
  const selectedTransactions = selectedDateStr ? byDate.get(selectedDateStr) ?? [] : [];

  const dateKeyFor = (dayNumber: number) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;

  return (
    <section className="cc-section mb-8 rounded-xl p-5" aria-labelledby="calendar-title">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b cc-border pb-4 sm:flex-row sm:items-center">
        <h2 id="calendar-title" className="text-lg font-bold cc-text-primary">
          Lịch giao dịch chi tiêu
        </h2>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <select aria-label="Chọn tháng" className="cc-control rounded-lg p-2 text-sm font-semibold" value={currentMonth} onChange={(event) => setCurrentMonth(Number(event.target.value))}>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index} value={index}>Tháng {index + 1}</option>
            ))}
          </select>
          <select aria-label="Chọn năm" className="cc-control rounded-lg p-2 text-sm font-semibold" value={currentYear} onChange={(event) => setCurrentYear(Number(event.target.value))}>
            {yearOptions.map((year) => (
              <option key={year} value={year}>Năm {year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-2 text-center text-xs font-bold cc-text-muted">
        {weekdays.map((day, index) => (
          <div key={day} className={index === 0 ? "text-red-400" : ""}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array(firstDayIndex).fill(null).map((_, index) => (
          <div key={`empty-${index}`} className="min-h-24 rounded-lg border border-dashed cc-border bg-surface-elevated" />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((dayNumber) => {
          const dateKey = dateKeyFor(dayNumber);
          const dayTransactions = byDate.get(dateKey) ?? [];
          const total = dayTransactions.reduce((sum, transaction) => sum + transaction.outcomeAmount, 0);
          const isToday = todayObj.getDate() === dayNumber && todayObj.getMonth() === currentMonth && todayObj.getFullYear() === currentYear;

          return (
            <button key={dateKey} type="button" onClick={() => setSelectedDateStr(dateKey)} className={`group flex min-h-24 flex-col rounded-lg border p-2 text-left outline-none transition focus:ring-2 focus:ring-focus-ring ${isToday ? "border-blue-400 bg-blue-50" : "cc-border bg-surface hover:border-blue-500"}`}>
              <span className={`text-sm font-bold ${isToday ? "text-blue-700" : "cc-text-primary"}`}>{dayNumber}</span>
              {dayTransactions.length > 0 ? (
                <span className="mt-1.5 rounded border border-emerald-100 bg-emerald-50 p-1.5 text-[10px] font-medium leading-relaxed text-emerald-700">
                  {dayTransactions.length} giao dịch · {formatVnd(total)}
                </span>
              ) : (
                <span className="mt-auto self-end pt-2 text-[10px] font-semibold cc-text-muted opacity-0 transition-opacity group-hover:opacity-100">+ Thêm</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDateStr && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="day-transactions-title" className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b cc-border px-6 py-4">
              <h3 id="day-transactions-title" className="text-lg font-bold cc-text-primary">
                {formatDateDisplay(selectedDateStr)}
              </h3>
              <button type="button" onClick={() => setSelectedDateStr("")} aria-label="Đóng danh sách giao dịch" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">x</button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
              {selectedTransactions.length === 0 ? (
                <p className="rounded-lg border border-dashed cc-border p-4 text-center text-sm font-medium cc-text-muted">Chưa có giao dịch.</p>
              ) : (
                selectedTransactions.map((transaction) => (
                  <button key={transaction._id} type="button" onClick={() => onEdit(transaction)} className="block w-full rounded-lg border border-gray-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{transaction.card?.displayName ?? "Thẻ"}</p>
                        <p className="text-xs font-semibold cc-text-muted">{transaction.card?.providerName} · {transaction.card?.owner}</p>
                        {transaction.note && <p className="mt-1 break-words text-sm text-gray-600">{transaction.note}</p>}
                      </div>
                      <div className="shrink-0 text-right text-sm">
                        <p className="font-bold text-gray-900">{formatVnd(transaction.outcomeAmount)}</p>
                        <p className={transaction.derived.expectedNetProfit >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                          {formatVnd(transaction.derived.expectedNetProfit)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end gap-3 border-t cc-border p-5">
              <button type="button" onClick={() => setSelectedDateStr("")} className="rounded-lg px-4 py-2 text-sm font-semibold cc-text-primary hover:bg-surface-elevated">Đóng</button>
              <button type="button" onClick={() => onAdd(selectedDateStr)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Thêm giao dịch</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
