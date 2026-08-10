"use client";

import Link from "next/link";

/** Fee entry intentionally lives in one workspace-level Fee Center. */
export function CardFeePaymentSection({}: { cardId?: string }) {
  return <section className="cc-section mb-8 p-6" aria-labelledby="card-fee-title"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 id="card-fee-title" className="text-xl font-bold cc-text-primary">Phí thực tế</h2><p className="mt-2 text-sm cc-text-muted">Tất cả phí thường niên, phí quản lý và phí khác được nhập tập trung tại Fee Center để tránh ghi trùng.</p></div><Link href="/fees" className="shrink-0 rounded-lg bg-[#06b6d4] px-4 py-2.5 text-center text-sm font-bold text-white">Mở Fee Center</Link></div></section>;
}
