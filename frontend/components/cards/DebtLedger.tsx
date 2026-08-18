"use client";

import Link from "next/link";
import { formatDateDisplay, formatVnd, getDisplayName, getProviderName, type CreditCardView } from "@/components/cards/cardTypes";
import type { CardStatementView } from "@/lib/api/statementsClient";

type DebtLedgerProps = {
  statements: CardStatementView[];
  cards: CreditCardView[];
};

const statusLabel: Record<CardStatementView["paymentStatus"], string> = {
  OPEN: "Mở",
  STATEMENT_CLOSED: "Đã chốt",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn",
};

export function DebtLedger({ statements, cards }: DebtLedgerProps) {
  const cardsById = new Map(cards.map((card) => [card._id, card]));
  const rows = [...statements]
    .filter((statement) => cardsById.has(statement.userCardId))
    .sort((left, right) => right.statementDate.localeCompare(left.statementDate));

  return (
    <section className="cc-section mb-8 p-5" aria-labelledby="debt-ledger-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-violet-700">SỔ NỢ THẺ</p>
          <h2 id="debt-ledger-title" className="mt-1 text-xl font-bold cc-text-primary">Tất cả khoản nợ phát sinh</h2>
          <p className="mt-1 text-sm cc-text-muted">Bao gồm cả các kỳ đã thanh toán; “còn phải trả” chỉ là phần chưa tất toán.</p>
        </div>
        <span className="text-sm font-semibold cc-text-muted">{rows.length} kỳ sao kê</span>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b cc-border cc-text-muted">
              <tr>
                <th className="px-3 py-3 font-semibold">Thẻ</th>
                <th className="px-3 py-3 font-semibold">Ngày chốt</th>
                <th className="px-3 py-3 text-right font-semibold">Phát sinh</th>
                <th className="px-3 py-3 text-right font-semibold">Đã trả</th>
                <th className="px-3 py-3 text-right font-semibold">Còn phải trả</th>
                <th className="px-3 py-3 text-right font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((statement) => {
                const card = cardsById.get(statement.userCardId)!;
                const gross = Number(statement.summary.totalAmountDue ?? 0);
                const outstanding = Number(statement.summary.outstandingAmount ?? 0);
                const paid = Math.min(gross, Math.max(0, gross - outstanding));
                return (
                  <tr key={statement._id} className="border-b last:border-b-0 cc-border">
                    <td className="px-3 py-3">
                      <Link href={`/cards/${card._id}`} className="font-semibold text-blue-700 hover:underline">
                        {getProviderName(card)} · {getDisplayName(card)}
                      </Link>
                    </td>
                    <td className="px-3 py-3 cc-text-muted">{formatDateDisplay(statement.statementDate)}</td>
                    <td className="px-3 py-3 text-right font-semibold">{formatVnd(gross)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-emerald-700">{formatVnd(paid)}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${outstanding > 0 ? "cc-danger" : "text-emerald-700"}`}>{formatVnd(outstanding)}</td>
                    <td className="px-3 py-3 text-right font-semibold cc-text-muted">{statusLabel[statement.paymentStatus]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-8 text-center text-sm cc-text-muted">Chưa có khoản nợ phát sinh trong dữ liệu sao kê.</p>
      )}
    </section>
  );
}
