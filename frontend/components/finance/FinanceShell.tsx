import type { ReactNode } from "react";

export const vnd = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
export const typeLabel: Record<string, string> = { DEBIT: "Debit", CASH: "Cash", E_WALLET: "Ví điện tử", CREDIT: "Credit" };
export const typeClass: Record<string, string> = { DEBIT: "bg-cyan-100 text-cyan-800", CASH: "bg-emerald-100 text-emerald-800", E_WALLET: "bg-sky-100 text-sky-800", CREDIT: "bg-violet-100 text-violet-800" };

export function FinanceShell({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <main className="cc-page min-h-screen bg-[#f4f7fa] px-4 py-8 md:px-8"><div className="mx-auto max-w-7xl"><header className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#087f83]">PERSONAL FINANCE</p><h1 className="mt-2 text-3xl font-bold cc-text-primary">{title}</h1></div>{action}</header>{children}</div></main>;
}

export function Metric({ label, value, tone = "normal", hint }: { label: string; value: number; tone?: "normal" | "debt" | "positive" | "receivable"; hint?: string }) {
  const color = tone === "debt" ? "text-violet-700" : tone === "positive" ? "text-emerald-700" : tone === "receivable" ? "text-orange-600" : "text-slate-900";
  return <section className="cc-section p-5"><p className="text-sm font-semibold cc-text-muted">{label}</p><p className={`mt-3 text-2xl font-bold ${color}`}>{vnd(value)}</p>{hint ? <p className="mt-1 text-xs cc-text-muted">{hint}</p> : null}</section>;
}
