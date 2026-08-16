"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FinanceShell, Metric, vnd, typeClass, typeLabel } from "@/components/finance/FinanceShell";
import { getFinancialSummary, listFinancialTransactions, type FinancialTransaction } from "@/lib/api/financeClient";
import type { FinancialReportDto } from "@card-credit/contracts";

const monthRange = () => { const now = new Date(); return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }; };
export default function DashboardPage() {
  const [summary, setSummary] = useState<FinancialReportDto | null>(null); const [rows, setRows] = useState<FinancialTransaction[]>([]); const [error, setError] = useState("");
  useEffect(() => { const { from, to } = monthRange(); void Promise.all([getFinancialSummary(from, to), listFinancialTransactions({ from, to })]).then(([s, r]) => { setSummary(s); setRows(r.slice(0, 6)); }).catch(() => setError("Không thể tải tổng quan tài chính.")); }, []);
  return <FinanceShell title="Tổng quan" action={<Link href="/transactions?add=1" className="rounded-lg bg-[#087f83] px-4 py-2.5 font-semibold text-white">+ Thêm giao dịch</Link>}>
    {error ? <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</p> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="Tài sản ròng" value={summary?.netAssets ?? 0} tone="positive" hint="DEBIT + CASH + E-WALLET"/><Metric label="Nợ Credit" value={summary?.creditDebtBalance ?? 0} tone="debt" hint="Chỉ giảm khi trả nợ"/><Metric label="Chi tiêu cá nhân" value={summary?.totals.personalSpending ?? 0}/><Metric label="Khoản phải thu" value={summary?.totals.outstandingReceivable ?? 0} tone="receivable" hint="Đã trừ khoản hoàn"/></div>
    <section className="cc-section mt-6 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Giao dịch gần đây</h2><Link href="/transactions" className="text-sm font-semibold text-[#087f83]">Xem tất cả</Link></div>{rows.length ? <div className="divide-y">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-semibold">{row.note || row.categoryId}</p><p className="text-xs cc-text-muted">{row.transactionDate} · <span className={`rounded px-2 py-0.5 ${typeClass[row.accountType]}`}>{typeLabel[row.accountType]}</span></p></div><p className="font-bold">{vnd(row.amount)}</p></div>)}</div> : <p className="py-10 text-center cc-text-muted">Chưa có giao dịch trong kỳ.</p>}</section>
  </FinanceShell>;
}
