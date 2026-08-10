"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAllCardStatements, updateStatementPayment, type CardStatementView } from "@/lib/api/transactionsClient";
import { formatVnd } from "@/components/cards/cardTypes";

export default function PaymentsPage() {
  const [rows, setRows] = useState<CardStatementView[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => { void fetchAllCardStatements().then(setRows).catch((e) => setError(e instanceof Error ? e.message : "Không thể tải thanh toán.")); }, []);
  const pay = async (row: CardStatementView) => { setBusy(row._id); try { const next = await updateStatementPayment(row.userCardId, row._id, "PAID"); setRows((current) => current.map((item) => item._id === next._id ? next : item)); } catch (e) { setError(e instanceof Error ? e.message : "Không thể cập nhật thanh toán."); } finally { setBusy(""); } };
  return <main className="cc-page min-h-screen px-4 py-8 md:px-8"><div className="mx-auto max-w-6xl"><header className="mb-8 flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#00687a]">PAYMENTS</p><h1 className="mt-2 text-3xl font-bold cc-text-primary">Payments</h1><p className="mt-1 cc-text-muted">Các kỳ sao kê cần thanh toán và lịch sử đã hoàn tất.</p></div><Link href="/cards" className="cc-control h-fit rounded-lg px-4 py-2 text-sm font-semibold">Dashboard</Link></header><section className="cc-section p-5">{error ? <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p> : rows.length === 0 ? <p className="py-12 text-center cc-text-muted">Chưa có kỳ sao kê.</p> : <div className="grid gap-4 md:grid-cols-2">{rows.map((row) => { const paid = row.paymentStatus === "PAID"; const amount = Math.max(0, Number(row.summary?.totalAmountDue ?? 0) - Number(row.paidAmount ?? 0)); return <article key={row._id} className="rounded-xl border p-5" style={{ borderColor: "var(--border)" }}><div className="flex justify-between gap-4"><div><p className="font-bold">Card {row.userCardId.slice(-6)}</p><p className="mt-1 text-sm cc-text-muted">Hạn thanh toán: {row.paymentDueDate}</p></div><span className={`h-fit rounded-full px-2.5 py-1 text-xs font-bold ${paid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{paid ? "Đã trả" : "Cần trả"}</span></div><p className="mt-6 text-2xl font-bold cc-tabular">{formatVnd(amount)}</p>{!paid && <button type="button" disabled={busy === row._id} onClick={() => void pay(row)} className="mt-4 w-full rounded-lg bg-[#06b6d4] px-4 py-2.5 font-bold text-white disabled:opacity-60">{busy === row._id ? "Đang cập nhật..." : "Đánh dấu đã thanh toán"}</button>}</article>; })}</div>}</section></div></main>;
}
