"use client";

import { useMemo, useState } from "react";
import { formatDateDisplay } from "@/components/cards/cardTypes";

type CalendarNotesProps = {
  notes: Record<string, string>;
  submitting: boolean;
  onSave: (date: string, content: string) => Promise<boolean>;
};

export function CalendarNotes({ notes, submitting, onSave }: CalendarNotesProps) {
  const todayObj = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(todayObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayObj.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [noteText, setNoteText] = useState("");

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const weekdays = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const yearOptions = Array.from({ length: 11 }, (_, index) => todayObj.getFullYear() - 5 + index);

  const handleDayClick = (dayNumber: number) => {
    const paddedMonth = String(currentMonth + 1).padStart(2, "0");
    const paddedDay = String(dayNumber).padStart(2, "0");
    const dateKey = `${currentYear}-${paddedMonth}-${paddedDay}`;

    setSelectedDateStr(dateKey);
    setNoteText(notes[dateKey] || "");
  };

  const closeModal = () => {
    setSelectedDateStr("");
    setNoteText("");
  };

  return (
    <section className="mb-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm" aria-labelledby="calendar-title">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center">
        <h2 id="calendar-title" className="text-lg font-bold text-gray-900">
          Lịch Ghi Chú Chi Tiêu & Nhắc Hạn
        </h2>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <select
            aria-label="Chọn tháng"
            className="rounded-xl border border-gray-300 bg-gray-50 p-2 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            value={currentMonth}
            onChange={(event) => setCurrentMonth(Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index} value={index}>
                Tháng {index + 1}
              </option>
            ))}
          </select>

          <select
            aria-label="Chọn năm"
            className="rounded-xl border border-gray-300 bg-gray-50 p-2 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            value={currentYear}
            onChange={(event) => setCurrentYear(Number(event.target.value))}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                Năm {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400">
        {weekdays.map((day, index) => (
          <div key={day} className={index === 0 ? "text-red-400" : ""}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array(firstDayIndex)
          .fill(null)
          .map((_, index) => (
            <div key={`empty-${index}`} className="min-h-20 rounded-xl border border-dashed border-gray-200/60 bg-gray-50/50" />
          ))}

        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((dayNumber) => {
          const paddedMonth = String(currentMonth + 1).padStart(2, "0");
          const paddedDay = String(dayNumber).padStart(2, "0");
          const dateKey = `${currentYear}-${paddedMonth}-${paddedDay}`;
          const hasNote = Boolean(notes[dateKey]);
          const isToday =
            todayObj.getDate() === dayNumber &&
            todayObj.getMonth() === currentMonth &&
            todayObj.getFullYear() === currentYear;

          return (
            <button
              type="button"
              key={dateKey}
              onClick={() => handleDayClick(dayNumber)}
              className={`group flex min-h-20 flex-col rounded-xl border p-2 text-left outline-none transition focus:ring-2 focus:ring-blue-500 ${
                isToday ? "border-blue-300 bg-blue-50/70" : "border-gray-200 bg-white hover:border-blue-400"
              }`}
            >
              <span className={`text-sm font-bold ${isToday ? "text-blue-600" : "text-gray-700"}`}>{dayNumber}</span>
              {hasNote ? (
                <span className="mt-1.5 w-full break-words rounded border border-emerald-100 bg-emerald-50 p-1.5 text-[10px] font-medium leading-relaxed text-emerald-700">
                  {notes[dateKey]}
                </span>
              ) : (
                <span className="mt-auto self-end pt-2 text-[10px] text-gray-300 opacity-0 transition-opacity group-hover:opacity-100">
                  + Thêm note
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDateStr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="note-modal-title" className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 id="note-modal-title" className="text-lg font-bold text-gray-900">
                Ghi chú Ngày {formatDateDisplay(selectedDateStr)}
              </h3>
              <button type="button" aria-label="Đóng ghi chú" onClick={closeModal} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                x
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void onSave(selectedDateStr, noteText).then((saved) => {
                  if (saved) closeModal();
                });
              }}
              className="space-y-4 p-6"
            >
              <div>
                <label htmlFor="note-content" className="mb-1 block text-sm font-medium text-gray-900">
                  Nội dung ghi chú
                </label>
                <textarea
                  id="note-content"
                  rows={4}
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Nhập note chi tiêu, nhắc nhở hoặc nhật ký quẹt thẻ... (Để trống để xóa note)"
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="rounded-lg px-5 py-2.5 font-medium text-gray-900 hover:bg-gray-100">
                  Hủy
                </button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white disabled:opacity-60">
                  {submitting ? "Đang lưu..." : "Lưu ghi chú"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
