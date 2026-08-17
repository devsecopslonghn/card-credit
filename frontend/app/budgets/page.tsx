"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FinanceShell, vnd } from "@/components/finance/FinanceShell";
import { getBudgetStatus, upsertBudget } from "@/lib/api/financeClient";
import type { BudgetStatusDto } from "@card-credit/contracts";
export default function BudgetsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [categoryId, setCategoryId] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [items, setItems] = useState<BudgetStatusDto[]>([]);
  const [error, setError] = useState("");
  const load = () => getBudgetStatus(month).then(setItems).catch(() => setError("Chưa có dữ liệu ngân sách hoặc không thể tải."));
  useEffect(() => { void getBudgetStatus(month).then((value) => { setItems(value); setError(""); }).catch(() => setError("Chưa có dữ liệu ngân sách hoặc không thể tải.")); }, [month]);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try { await upsertBudget({ month, categoryId, limitAmount: Number(limitAmount) }); setCategoryId(""); setLimitAmount(""); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu ngân sách."); }
  };
  return <FinanceShell title="Ngân sách tháng"><section className="cc-section mb-6 p-5"><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold">Quản lý hạn mức</h2><label className="text-sm font-semibold">Tháng<input aria-label="Tháng ngân sách" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="cc-control ml-2 rounded-lg px-3 py-2" /></label></div><form onSubmit={save} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input aria-label="Category ID" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} placeholder="Category ID" className="cc-control rounded-lg px-3 py-2" /><input aria-label="Hạn mức" required min="1" step="1" type="number" value={limitAmount} onChange={(event) => setLimitAmount(event.target.value)} placeholder="Hạn mức VND" className="cc-control rounded-lg px-3 py-2" /><button type="submit" className="rounded-lg bg-[#087f83] px-4 py-2 font-semibold text-white">Lưu ngân sách</button></form></section><section className="cc-section p-5">{error ? <p className="mb-4 rounded-lg bg-amber-50 p-4 text-amber-800">{error}</p> : items.length ? <div className="grid gap-4 md:grid-cols-2">{items.map((item) => { const percentage = Math.round(item.usagePercent); return <article key={item.id} className="rounded-xl border p-4"><div className="flex justify-between"><h3 className="font-bold">{item.categoryId}</h3><strong>{percentage}%</strong></div><div className="mt-3 h-3 rounded-full bg-slate-100"><div className={`h-3 rounded-full ${item.status === "EXCEEDED" ? "bg-red-500" : item.status === "WARNING" ? "bg-orange-500" : "bg-cyan-600"}`} style={{ width: `${Math.min(100, percentage)}%` }}/></div><div className="mt-3 flex justify-between text-sm cc-text-muted"><span>Đã chi {vnd(item.usedAmount)}</span><span>Còn {vnd(item.remainingAmount)}</span></div></article>; })}</div> : <p className="py-10 text-center cc-text-muted">Chưa có quota. Hãy tạo ngân sách theo danh mục.</p>}</section></FinanceShell>;
}
