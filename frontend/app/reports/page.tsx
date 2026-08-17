"use client";
import { useEffect, useState } from "react";
import { FinanceShell, Metric, vnd } from "@/components/finance/FinanceShell";
import { getFinancialSummary } from "@/lib/api/financeClient";
import { fetchCards } from "@/lib/api/cardsClient";
import { getDisplayName, getProviderName } from "@/components/cards/cardTypes";
import type { CreditCardView } from "@/components/cards/cardTypes";
import type { FinancialReportDto } from "@card-credit/contracts";
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = (value: string) => `${value.slice(0, 7)}-01`;

export default function ReportsPage() {
  const initialToday = today();
  const [from, setFrom] = useState(monthStart(initialToday));
  const [to, setTo] = useState(initialToday);
  const [cardId, setCardId] = useState("");
  const [owner, setOwner] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [cards, setCards] = useState<CreditCardView[]>([]);
  const [data, setData] = useState<FinancialReportDto | null>(null);
  const [error, setError] = useState("");
  const owners = [...new Set(cards.map((card) => card.owner?.trim()).filter((value): value is string => Boolean(value)))].sort();
  useEffect(() => {
    const query = year
      ? { year, ...(month ? { month } : {}), ...(cardId ? { cardId } : {}), ...(owner ? { owner } : {}) }
      : { from, to, ...(cardId ? { cardId } : {}), ...(owner ? { owner } : {}) };
    void getFinancialSummary(query).then((value) => { setData(value); setError(""); }).catch(() => setError("Không thể tải báo cáo cho bộ lọc đã chọn."));
  }, [from, to, cardId, owner, year, month]);
  useEffect(() => { void fetchCards().then((value) => setCards(value.filter((card) => card.active))).catch(() => setCards([])); }, []);
  return <FinanceShell title="Báo cáo tài chính">
    <section className="cc-section mb-6 flex flex-wrap items-end gap-4 p-5">
      <label className="flex min-w-44 flex-1 flex-col gap-2 text-sm font-semibold">Từ ngày<input aria-label="Từ ngày" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="cc-control rounded-lg px-3 py-2" /></label>
      <label className="flex min-w-44 flex-1 flex-col gap-2 text-sm font-semibold">Đến ngày<input aria-label="Đến ngày" type="date" value={to} min={from} max={today()} onChange={(event) => setTo(event.target.value)} className="cc-control rounded-lg px-3 py-2" /></label>
      <label className="flex min-w-56 flex-1 flex-col gap-2 text-sm font-semibold">Theo thẻ<select aria-label="Lọc theo thẻ" value={cardId} onChange={(event) => setCardId(event.target.value)} className="cc-control rounded-lg px-3 py-2"><option value="">Tất cả thẻ</option>{cards.map((card) => <option key={card._id} value={card._id}>{getProviderName(card)} · {getDisplayName(card)}</option>)}</select></label>
      <label className="flex min-w-44 flex-1 flex-col gap-2 text-sm font-semibold">Theo chủ thẻ<select aria-label="Lọc theo chủ thẻ" value={owner} onChange={(event) => setOwner(event.target.value)} className="cc-control rounded-lg px-3 py-2"><option value="">Tất cả chủ thẻ</option>{owners.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="flex min-w-32 flex-1 flex-col gap-2 text-sm font-semibold">Năm<input aria-label="Năm báo cáo" type="number" min="2000" max="2100" value={year} onChange={(event) => { setYear(event.target.value); if (!event.target.value) setMonth(""); }} className="cc-control rounded-lg px-3 py-2" /></label>
      <label className="flex min-w-32 flex-1 flex-col gap-2 text-sm font-semibold">Tháng<select aria-label="Tháng báo cáo" value={month} disabled={!year} onChange={(event) => setMonth(event.target.value)} className="cc-control rounded-lg px-3 py-2"><option value="">Cả năm</option>{Array.from({ length: 12 }, (_, index) => { const value = String(index + 1).padStart(2, "0"); return <option key={value} value={value}>{value}</option>; })}</select></label>
    </section>
    {error ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="Personal spending" value={data?.totals.personalSpending ?? 0}/><Metric label="Debit/Cash/E-wallet flow" value={data?.totals.debitCashflow ?? 0} tone="positive"/><Metric label="Credit debt" value={data?.totals.creditDebt ?? 0} tone="debt"/><Metric label="Khoản phải thu" value={data?.totals.outstandingReceivable ?? 0} tone="receivable"/></div>
    <section className="cc-section mt-6 p-5"><h2 className="text-xl font-bold">Lợi ích và chi phí</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="Phí dịch vụ" value={data?.totals.totalServiceFee ?? 0} tone="debt"/><Metric label="Cashback giao dịch" value={data?.totals.transactionCashbackActual ?? 0} tone="positive"/><Metric label="Cashback ngân hàng" value={data?.totals.monthlyBankCashbackActual ?? 0} tone="positive"/><Metric label="Lợi ích ròng thực tế" value={data?.totals.actualNetBenefit ?? 0} tone="positive"/></div><p className="mt-4 text-sm cc-text-muted">Cashback giao dịch chỉ để đối chiếu; lợi ích ròng dùng cashback ngân hàng thực nhận trừ phí dịch vụ và phí thẻ đã trả.</p></section>
    <section className="cc-section mt-6 p-5"><h2 className="text-xl font-bold">Chi tiêu theo danh mục</h2><div className="mt-5 space-y-4">{Object.entries(data?.byCategory ?? {}).map(([category, value]) => <div key={category}><div className="flex justify-between text-sm"><span>{category}</span><strong>{vnd(value.personalSpending)}</strong></div><div className="mt-2 h-3 rounded-full bg-slate-100"><div className="h-3 w-1/2 rounded-full bg-cyan-600" /></div></div>)}</div></section>
  </FinanceShell>;
}
