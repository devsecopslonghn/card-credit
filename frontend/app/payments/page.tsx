"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCards } from "@/lib/api/cardsClient";
import { listFinanceAccounts, type FinanceAccount } from "@/lib/api/financeClient";
import {
  fetchAllCardStatements,
  createStatementPaymentKey,
  previewStatementPayment,
  updateStatementPayment,
  type CardStatementView,
} from "@/lib/api/statementsClient";
import {
  formatVnd,
  getDisplayName,
  getProviderName,
  type CreditCardView,
} from "@/components/cards/cardTypes";

type StatusFilter = "ALL" | "OPEN" | "PAID" | "OVERDUE";

const statusMeta: Record<StatusFilter, { label: string; className: string }> = {
  ALL: { label: "Tất cả", className: "" },
  OPEN: { label: "Cần trả", className: "bg-cyan-100 text-cyan-800" },
  PAID: { label: "Đã trả", className: "bg-emerald-100 text-emerald-800" },
  OVERDUE: { label: "Quá hạn", className: "bg-red-100 text-red-800" },
};

const formatPeriod = (date: string) => {
  const value = new Date(`${date}T00:00:00`);
  return Number.isNaN(value.getTime()) ? date : `Tháng ${value.getMonth() + 1}/${value.getFullYear()}`;
};

const cardLabel = (card?: CreditCardView) =>
  card ? `${getProviderName(card)} · ${getDisplayName(card)}` : "Thẻ tín dụng";

export default function PaymentsPage() {
  const [rows, setRows] = useState<CardStatementView[]>([]);
  const [cards, setCards] = useState<CreditCardView[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [repaymentAccountId, setRepaymentAccountId] = useState("");
  const [query, setQuery] = useState("");
  const [cardId, setCardId] = useState("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const paymentCommandKeysRef = useRef(new Map<string, string>());

  useEffect(() => {
    void Promise.all([fetchAllCardStatements(), fetchCards(), listFinanceAccounts()])
      .then(([statements, cardItems, accountItems]) => {
        setRows(statements);
        setCards(cardItems);
        setAccounts(accountItems);
        setRepaymentAccountId((current) => current || accountItems.find((account) => account.active && account.group === "REAL_MONEY")?.id || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không thể tải thanh toán."));
  }, []);

  const cardById = useMemo(() => new Map(cards.map((card) => [card._id, card])), [cards]);
  const enriched = useMemo(() => rows.map((row) => ({
    row,
    card: cardById.get(row.userCardId),
    amount: Math.max(0, Number(row.summary?.outstandingAmount ?? 0)),
    effectiveStatus: row.effectivePaymentStatus || row.paymentStatus,
  })), [cardById, rows]);
  const repaymentAccounts = useMemo(() => accounts.filter((account) => account.active && account.group === "REAL_MONEY"), [accounts]);
  const filtered = useMemo(() => enriched.filter(({ row, card, effectiveStatus }) => {
    const haystack = `${cardLabel(card)} ${row.periodStartDate} ${row.periodEndDate}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) &&
      (cardId === "ALL" || row.userCardId === cardId) &&
      (status === "ALL" || effectiveStatus === status) &&
      (!fromDate || row.paymentDueDate >= fromDate) &&
      (!toDate || row.paymentDueDate <= toDate);
  }), [cardId, enriched, fromDate, query, status, toDate]);
  const totals = useMemo(() => enriched.reduce((result, item) => {
    result.total += item.amount;
    if (item.effectiveStatus === "PAID") result.paid += item.amount;
    if (item.effectiveStatus === "OVERDUE") result.overdue += item.amount;
    if (item.effectiveStatus !== "PAID") result.unpaid += item.amount;
    return result;
  }, { total: 0, paid: 0, unpaid: 0, overdue: 0 }), [enriched]);

  const pay = async (row: CardStatementView) => {
    setBusy(row._id);
    setError("");
    try {
      const preview = await previewStatementPayment(row.userCardId, row._id, "PAID", repaymentAccountId || undefined);
      if (preview.requiresRepaymentAccount) {
        setError("Hãy chọn tài khoản DEBIT/CASH/E_WALLET để trả sao kê.");
        return;
      }
      if (!window.confirm(`Xác nhận thanh toán ${formatVnd(preview.amountToPay)} cho kỳ sao kê này?`)) return;
      const commandKey = paymentCommandKeysRef.current.get(row._id) ?? createStatementPaymentKey();
      paymentCommandKeysRef.current.set(row._id, commandKey);
      const next = await updateStatementPayment(row.userCardId, row._id, "PAID", preview.repaymentAccountId ?? undefined, commandKey, preview.version ?? undefined, preview);
      setRows((current) => current.map((item) => item._id === next._id ? next : item));
      paymentCommandKeysRef.current.delete(row._id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể cập nhật thanh toán.");
    } finally {
      setBusy("");
    }
  };

  const resetFilters = () => { setQuery(""); setCardId("ALL"); setStatus("ALL"); setFromDate(""); setToDate(""); };
  const statusBadge = (value: string) => {
    const key = (value === "STATEMENT_CLOSED" ? "OPEN" : value) as StatusFilter;
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusMeta[key]?.className ?? "bg-amber-100 text-amber-800"}`}>{statusMeta[key]?.label ?? "Cần trả"}</span>;
  };

  return <main className="cc-page min-h-screen px-4 py-8 md:px-8"><div className="mx-auto max-w-6xl">
    <header className="mb-8 flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#23899a]">PAYMENTS</p><h1 className="mt-2 text-3xl font-bold cc-text-primary">Thanh toán</h1><p className="mt-1 cc-text-muted">Theo dõi các kỳ sao kê cần trả và lịch sử thanh toán.</p></div><Link href="/cards" className="cc-control h-fit rounded-lg px-4 py-2 text-sm font-semibold">Dashboard</Link></header>
    <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Tổng cần trả", totals.total, "bg-cyan-50"], ["Đã thanh toán", totals.paid, "bg-emerald-50"], ["Chưa thanh toán", totals.unpaid, "bg-slate-50"], ["Quá hạn", totals.overdue, "bg-red-50"]].map(([label, value, tone]) => <article key={String(label)} className={`cc-section p-4 ${tone}`}><p className="text-xs font-bold cc-text-muted">{label}</p><p className="mt-2 text-xl font-bold cc-tabular">{formatVnd(Number(value))}</p></article>)}</section>
    <section className="cc-section overflow-hidden p-4 md:p-5">
      <div className="mb-4 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr_auto_auto]"><input aria-label="Tìm kiếm thanh toán" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo ngân hàng hoặc tên thẻ..." className="cc-control rounded-lg px-3 py-2.5" /><select aria-label="Lọc theo thẻ" value={cardId} onChange={(e) => setCardId(e.target.value)} className="cc-control rounded-lg px-3 py-2.5"><option value="ALL">Tất cả thẻ</option>{cards.map((card) => <option key={card._id} value={card._id}>{cardLabel(card)}</option>)}</select><select aria-label="Lọc theo trạng thái" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="cc-control rounded-lg px-3 py-2.5">{Object.entries(statusMeta).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select><select aria-label="Tài khoản trả nợ" value={repaymentAccountId} onChange={(e) => setRepaymentAccountId(e.target.value)} className="cc-control rounded-lg px-3 py-2.5"><option value="">Chọn tài khoản trả nợ</option>{repaymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.type}</option>)}</select><input aria-label="Từ ngày" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="cc-control rounded-lg px-3 py-2.5" /><input aria-label="Đến ngày" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="cc-control rounded-lg px-3 py-2.5" /></div>
      <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm font-semibold cc-text-muted">Hiển thị {filtered.length}/{rows.length} kỳ sao kê</p><button type="button" onClick={resetFilters} className="text-sm font-bold text-[#00687a]">Xóa bộ lọc</button></div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
      {filtered.length === 0 ? <div className="rounded-lg border border-dashed p-12 text-center cc-text-muted">Không có kỳ sao kê phù hợp với bộ lọc.</div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[800px] text-sm"><thead className="bg-[#eef4ff]"><tr><th className="p-3 text-left">Thẻ</th><th className="p-3 text-left">Kỳ sao kê</th><th className="p-3 text-left">Hạn thanh toán</th><th className="p-3 text-right">Số tiền cần trả</th><th className="p-3 text-left">Trạng thái</th><th className="p-3 text-right">Thao tác</th></tr></thead><tbody>{filtered.map(({ row, card, amount, effectiveStatus }) => <tr key={row._id} className={`border-b ${effectiveStatus === "OVERDUE" ? "bg-red-50/70" : effectiveStatus === "OPEN" ? "bg-amber-50/70" : ""}`}><td className="p-3 font-semibold">{cardLabel(card)}</td><td className="p-3">{formatPeriod(row.periodStartDate)}</td><td className="p-3">{row.paymentDueDate}</td><td className="p-3 text-right font-bold cc-tabular">{formatVnd(amount)}</td><td className="p-3">{statusBadge(effectiveStatus)}</td><td className="p-3 text-right">{effectiveStatus !== "PAID" && <button type="button" disabled={busy === row._id} onClick={() => void pay(row)} className="rounded-lg bg-[#25b8d0] px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{busy === row._id ? "Đang lưu..." : "Đánh dấu đã thanh toán"}</button>}</td></tr>)}</tbody></table></div>
        <div className="space-y-3 md:hidden">{filtered.map(({ row, card, amount, effectiveStatus }) => <article key={row._id} className={`rounded-xl border p-4 ${effectiveStatus === "OVERDUE" ? "border-red-200 bg-red-50/70" : effectiveStatus === "OPEN" ? "border-amber-200 bg-amber-50/70" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{cardLabel(card)}</p><p className="mt-1 text-sm cc-text-muted">Hạn thanh toán: {row.paymentDueDate}</p><p className="text-xs cc-text-muted">{formatPeriod(row.periodStartDate)}</p></div>{statusBadge(effectiveStatus)}</div><p className="mt-4 text-2xl font-bold cc-tabular">{formatVnd(amount)}</p>{effectiveStatus !== "PAID" && <button type="button" disabled={busy === row._id} onClick={() => void pay(row)} className="mt-4 w-full rounded-lg bg-[#25b8d0] px-4 py-2.5 font-bold text-white disabled:opacity-60">{busy === row._id ? "Đang lưu..." : "Đánh dấu đã thanh toán"}</button>}</article>)}</div>
      </>}
    </section>
  </div></main>;
}
