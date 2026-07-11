"use client";

import {
  formatDateDisplay,
  formatVnd,
  getDisplayName,
  getProviderName,
  type CreditCardView,
} from "@/components/cards/cardTypes";
import {
  buildDueStatementGroups,
  buildOverdueStatementRows,
  type DueStatementRow,
} from "@/lib/cards/dueStatementsCore.mjs";
import type { CardStatementView } from "@/lib/api/transactionsClient";

type UpcomingPaymentsProps = {
  statements: CardStatementView[];
  cards: CreditCardView[];
  selectedOwner: string;
};

const statusLabel = {
  UPCOMING: "Sắp đến hạn",
  DUE_TODAY: "Đến hạn hôm nay",
  OVERDUE: "Quá hạn",
  PAID: "Đã thanh toán",
} as const;

const statusClass = {
  UPCOMING: "border-amber-300 bg-amber-50 text-warning",
  DUE_TODAY: "border-red-300 bg-red-50 text-danger",
  OVERDUE: "border-red-400 bg-red-100 text-danger-strong",
  PAID: "border-emerald-300 bg-emerald-50 text-success",
} as const;

export function UpcomingPayments({ statements, cards, selectedOwner }: UpcomingPaymentsProps) {
  const groups = buildDueStatementGroups({ statements, cards });
  const overdueRows = buildOverdueStatementRows({ statements, cards });

  if (groups.length === 0 && overdueRows.length === 0) {
    return (
      <section className="cc-section mb-8 rounded-xl p-5" aria-labelledby="upcoming-payments-title">
        <h2 id="upcoming-payments-title" className="text-xl font-bold cc-text-primary">
          Danh sách thẻ sắp đến hạn {selectedOwner && `của [${selectedOwner}]`}
        </h2>
        <p className="mt-3 text-sm font-medium cc-text-muted">Không có kỳ sao kê nào sắp đến hạn.</p>
      </section>
    );
  }

  return (
    <section className="cc-section mb-8 rounded-xl p-5" aria-labelledby="upcoming-payments-title">
      <div className="mb-5 border-b cc-border pb-4">
        <h2 id="upcoming-payments-title" className="text-xl font-bold cc-text-primary">
          Danh sách thẻ sắp đến hạn {selectedOwner && `của [${selectedOwner}]`}
        </h2>
      </div>

      {overdueRows.length > 0 && (
        <section className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4" aria-labelledby="overdue-title">
          <div className="mb-3 flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
            <div>
              <h3 id="overdue-title" className="text-base font-bold text-danger-strong">
                Quá hạn
              </h3>
              <p className="text-sm font-semibold text-danger">
                {overdueRows.length} kỳ quá hạn · {formatVnd(overdueRows.reduce((sum, row) => sum + row.amountDue, 0))}
              </p>
            </div>
          </div>
          <PaymentRows rows={overdueRows} compact />
        </section>
      )}

      {groups.map((group) => (
        <section key={group.monthKey} className="mb-6 last:mb-0" aria-labelledby={`due-${group.monthKey}`}>
          <div className="mb-3 flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
            <div>
              <h3 id={`due-${group.monthKey}`} className="text-base font-bold cc-text-primary">
                {group.monthLabel}
              </h3>
              <p className="text-sm font-semibold cc-text-muted">
                {group.dueCount} kỳ đến hạn · {formatVnd(group.dueAmount)}
              </p>
            </div>
          </div>
          <PaymentRows rows={group.rows} />
        </section>
      ))}
    </section>
  );
}

function PaymentRows({
  rows,
  compact = false,
}: {
  rows: DueStatementRow[];
  compact?: boolean;
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border cc-border md:block">
        <table className="w-full border-collapse bg-surface text-sm">
          <thead className="sticky top-0 bg-surface-elevated">
            <tr className="border-b cc-border text-left text-xs font-bold uppercase tracking-wide cc-text-muted">
              <th className="p-3">Thẻ</th>
              <th className="p-3">Ngân hàng</th>
              <th className="p-3">Chủ thẻ</th>
              {!compact && <th className="p-3 text-center">Kỳ sao kê</th>}
              <th className="p-3 text-center">Hạn thanh toán</th>
              <th className="p-3 text-right">Số tiền phải trả</th>
              <th className="p-3 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ statement, card, amountDue, status }) => (
              <tr key={statement._id} className="border-b cc-border last:border-b-0 hover:bg-surface-elevated">
                <td className="p-3 text-sm font-bold cc-text-primary">{getDisplayName(card)}</td>
                <td className="p-3 text-[13px] font-semibold cc-text-muted">{getProviderName(card)}</td>
                <td className="p-3">
                  <span className="cc-badge rounded-md px-2 py-1 text-xs font-bold">Thẻ: {card.owner || "Tôi"}</span>
                </td>
                {!compact && <td className="p-3 text-center font-semibold cc-text-muted">{formatDateDisplay(statement.statementDate)}</td>}
                <td className="p-3 text-center font-bold cc-danger">{formatDateDisplay(statement.paymentDueDate)}</td>
                <td className="cc-tabular p-3 text-right text-sm font-bold cc-text-primary">{formatVnd(amountDue)}</td>
                <td className="p-3 text-center">
                  <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${statusClass[status]}`}>
                    {statusLabel[status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map(({ statement, card, amountDue, status }) => (
          <article key={statement._id} className="cc-panel rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="break-words text-base font-bold cc-text-primary">{getDisplayName(card)}</h4>
                <p className="mt-1 text-[13px] font-semibold cc-text-muted">{getProviderName(card)}</p>
                <span className="cc-badge mt-2 inline-flex rounded-md px-2 py-1 text-xs font-bold">
                  Thẻ: {card.owner || "Tôi"}
                </span>
              </div>
              <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${statusClass[status]}`}>
                {statusLabel[status]}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-semibold cc-text-muted">Kỳ sao kê</dt>
                <dd className="mt-1 font-bold cc-text-primary">{formatDateDisplay(statement.statementDate)}</dd>
              </div>
              <div className="text-right">
                <dt className="font-semibold cc-text-muted">Hạn thanh toán</dt>
                <dd className="mt-1 font-bold cc-danger">{formatDateDisplay(statement.paymentDueDate)}</dd>
              </div>
              <div className="col-span-2 text-right">
                <dt className="font-semibold cc-text-muted">Số tiền phải trả</dt>
                <dd className="cc-tabular mt-1 text-lg font-bold cc-text-primary">{formatVnd(amountDue)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
