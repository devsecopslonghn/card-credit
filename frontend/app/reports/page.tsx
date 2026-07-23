"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  formatDateDisplay,
  formatVnd,
  getDisplayName,
  getProviderName,
  type CreditCardView,
} from "@/components/cards/cardTypes";
import { fetchCards } from "@/lib/api/cardsClient";
import {
  fetchReportSummary,
  reportApiUrl,
  type ReportFilters,
  type ReportSummary,
} from "@/lib/api/reportsClient";

type RangeMode = "all" | "year" | "month";
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, "0"),
  label: `Tháng ${index + 1}`,
}));

export default function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string; cardId?: string }>;
}) {
  const initial = use(searchParams);
  const now = new Date();
  const [rangeMode, setRangeMode] = useState<RangeMode>("all");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(
    String(now.getMonth() + 1).padStart(2, "0"),
  );
  const [owner, setOwner] = useState(initial.owner ?? "");
  const [cardId, setCardId] = useState(initial.cardId ?? "");
  const [cards, setCards] = useState<CreditCardView[]>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = useMemo<ReportFilters>(
    () => ({
      ...(owner ? { owner } : {}),
      ...(cardId ? { cardId } : {}),
      ...(rangeMode === "all" ? {} : { year }),
      ...(rangeMode === "month" ? { month } : {}),
    }),
    [cardId, month, owner, rangeMode, year],
  );

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await fetchReportSummary(filters));
    } catch (loadError) {
      setReport(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải báo cáo hiệu quả thẻ.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadReport(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadReport]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchCards()
        .then(setCards)
        .catch(() => setCards([]));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const owners = useMemo(
    () =>
      [...new Set(cards.map((card) => card.owner || "Tôi"))].sort((a, b) =>
        a.localeCompare(b, "vi"),
      ),
    [cards],
  );
  const cardOptions = useMemo(
    () =>
      cards.filter((card) => !owner || (card.owner || "Tôi") === owner),
    [cards, owner],
  );

  const handleOwnerChange = (nextOwner: string) => {
    setOwner(nextOwner);
    if (
      cardId &&
      !cards.some(
        (card) =>
          card._id === cardId &&
          (!nextOwner || (card.owner || "Tôi") === nextOwner),
      )
    )
      setCardId("");
  };

  return (
    <div className="cc-page min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="cc-section mb-8 rounded-xl p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <Link href="/cards" className="text-sm font-semibold text-blue-700 hover:underline">
                &larr; Quay lại danh sách thẻ
              </Link>
              <h1 className="mt-2 text-3xl font-bold cc-text-primary">
                Báo cáo hiệu quả sử dụng thẻ
              </h1>
              <p className="mt-1 text-sm cc-text-muted">
                Cashback ngân hàng theo tháng là nguồn “đã lấy lại” chính.
                Cashback giao dịch chỉ dùng để đối chiếu.
              </p>
            </div>
            <a href={reportApiUrl(filters)} target="_blank" rel="noopener noreferrer" className="cc-control rounded-lg px-5 py-2.5 text-center text-sm font-semibold hover:bg-surface-elevated">
              Xuất JSON theo filter
            </a>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <FilterLabel label="Khoảng thời gian">
              <select value={rangeMode} onChange={(event) => setRangeMode(event.target.value as RangeMode)} className="cc-control w-full rounded-lg px-3 py-2">
                <option value="all">Toàn thời gian</option>
                <option value="year">Theo năm</option>
                <option value="month">Theo tháng</option>
              </select>
            </FilterLabel>
            <FilterLabel label="Năm">
              <input type="number" min={1000} max={9998} disabled={rangeMode === "all"} value={year} onChange={(event) => setYear(event.target.value)} className="cc-control w-full rounded-lg px-3 py-2 disabled:bg-gray-100" />
            </FilterLabel>
            <FilterLabel label="Tháng">
              <select disabled={rangeMode !== "month"} value={month} onChange={(event) => setMonth(event.target.value)} className="cc-control w-full rounded-lg px-3 py-2 disabled:bg-gray-100">
                {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </FilterLabel>
            <FilterLabel label="Chủ thẻ">
              <select value={owner} onChange={(event) => handleOwnerChange(event.target.value)} className="cc-control w-full rounded-lg px-3 py-2">
                <option value="">Tất cả chủ thẻ</option>
                {owners.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </FilterLabel>
            <FilterLabel label="Thẻ">
              <select value={cardId} onChange={(event) => setCardId(event.target.value)} className="cc-control w-full rounded-lg px-3 py-2">
                <option value="">Tất cả thẻ</option>
                {cardOptions.map((card) => <option key={card._id} value={card._id}>{getProviderName(card)} · {getDisplayName(card)}</option>)}
              </select>
            </FilterLabel>
          </div>
        </header>

        {loading ? (
          <ReportState message="Đang tổng hợp báo cáo..." />
        ) : error ? (
          <ReportState message={error} error onRetry={loadReport} />
        ) : !report || report.cards.length === 0 ? (
          <ReportState message="Không có thẻ phù hợp với bộ lọc này." />
        ) : (
          <>
            <section aria-label="Chỉ số tổng hợp" className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Tổng chi tiêu" value={report.totals.totalOutcome} />
              <Kpi label="Tiền đối tác hoàn" value={report.totals.totalIncome} />
              <Kpi label="Phí dịch vụ" value={report.totals.totalServiceFee} tone="warning" />
              <Kpi label="Cashback ngân hàng dự kiến" value={report.totals.monthlyBankCashbackExpected} tone="success" />
              <Kpi label="Cashback ngân hàng thực nhận" value={report.totals.monthlyBankCashbackActual} tone="success" />
              <Kpi label="Cashback bị từ chối" value={report.totals.monthlyBankCashbackRejected} tone="danger" />
              <Kpi label="Lợi ích ròng thực tế" value={report.totals.actualNetBenefit} tone={report.totals.actualNetBenefit >= 0 ? "success" : "danger"} />
            </section>

            <section className="cc-section rounded-xl p-5" aria-labelledby="card-report-table-title">
              <h2 id="card-report-table-title" className="text-xl font-bold cc-text">
                Hiệu quả từng thẻ
              </h2>
              <p className="mb-4 mt-1 text-sm cc-text-muted">
                Thẻ không phát sinh dữ liệu trong kỳ vẫn hiển thị với số 0.
              </p>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-[1180px] w-full border-collapse text-sm">
                  <thead className="cc-panel text-left">
                    <tr>
                      {["Thẻ", "Ngày thêm", "GD", "Chi tiêu", "Đối tác hoàn", "Phí", "CB giao dịch", "CB tháng dự kiến", "CB tháng thực nhận", "Lợi ích ròng"].map((label, index) => (
                        <th key={label} className={`p-3 ${index > 1 ? "text-right" : ""}`}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.cards.map((card) => (
                      <tr key={card.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="p-3"><p className="font-bold">{card.providerName} · {card.displayName}</p><p className="text-xs cc-text-muted">{card.owner}</p></td>
                        <td className="p-3">{card.createdAt ? formatDateDisplay(card.createdAt.slice(0, 10)) : "—"}</td>
                        <ReportNumber value={String(card.totals.transactionCount)} />
                        <ReportNumber value={formatVnd(card.totals.totalOutcome)} />
                        <ReportNumber value={formatVnd(card.totals.totalIncome)} />
                        <ReportNumber value={formatVnd(card.totals.totalServiceFee)} />
                        <ReportNumber value={formatVnd(card.totals.expectedCashback)} />
                        <ReportNumber value={formatVnd(card.totals.monthlyBankCashbackExpected)} />
                        <ReportNumber value={formatVnd(card.totals.monthlyBankCashbackActual)} />
                        <ReportNumber value={formatVnd(card.totals.actualNetBenefit)} strong tone={card.totals.actualNetBenefit >= 0 ? "success" : "danger"} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-4 lg:hidden">
                {report.cards.map((card) => (
                  <article key={card.id} className="cc-panel rounded-xl p-4">
                    <h3 className="font-bold cc-text">{card.providerName} · {card.displayName}</h3>
                    <p className="text-xs cc-text-muted">{card.owner} · thêm {card.createdAt ? formatDateDisplay(card.createdAt.slice(0, 10)) : "không rõ"}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <Metric label="Số giao dịch" value={String(card.totals.transactionCount)} />
                      <Metric label="Chi tiêu" value={formatVnd(card.totals.totalOutcome)} />
                      <Metric label="Đối tác hoàn" value={formatVnd(card.totals.totalIncome)} />
                      <Metric label="Phí dịch vụ" value={formatVnd(card.totals.totalServiceFee)} />
                      <Metric label="CB giao dịch đối chiếu" value={formatVnd(card.totals.expectedCashback)} />
                      <Metric label="CB tháng dự kiến" value={formatVnd(card.totals.monthlyBankCashbackExpected)} />
                      <Metric label="CB tháng thực nhận" value={formatVnd(card.totals.monthlyBankCashbackActual)} />
                      <Metric label="Lợi ích ròng" value={formatVnd(card.totals.actualNetBenefit)} />
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function FilterLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-sm font-semibold cc-text-muted"><span className="mb-1 block">{label}</span>{children}</label>;
}

function Kpi({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "warning" | "danger" }) {
  const color = tone === "success" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : tone === "danger" ? "text-red-700" : "cc-text";
  return <div className="cc-section rounded-xl p-5"><p className="text-sm font-semibold cc-text-muted">{label}</p><p className={`mt-2 text-2xl font-bold cc-tabular ${color}`}>{formatVnd(value)}</p></div>;
}

function ReportNumber({ value, strong = false, tone = "default" }: { value: string; strong?: boolean; tone?: "default" | "success" | "danger" }) {
  const color = tone === "success" ? "text-emerald-700" : tone === "danger" ? "text-red-700" : "";
  return <td className={`p-3 text-right cc-tabular ${strong ? "font-bold" : ""} ${color}`}>{value}</td>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <><dt className="cc-text-muted">{label}</dt><dd className="text-right font-semibold cc-tabular">{value}</dd></>;
}

function ReportState({ message, error = false, onRetry }: { message: string; error?: boolean; onRetry?: () => void }) {
  return <div role={error ? "alert" : "status"} className={`cc-section rounded-xl p-10 text-center ${error ? "text-red-700" : "cc-text-muted"}`}><p className="font-semibold">{message}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Thử lại</button>}</div>;
}
