"use client";

import {
  formatDateDisplay,
  formatVnd,
  getDisplayName,
  getProviderName,
  type CreditCardView,
  type CardSummaryView,
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
  cardSummaries: Record<string, CardSummaryView>;
  selectedOwner: string;
  pendingActions: ReadonlySet<string>;
  onPaymentAction: (statement: NonNullable<DueStatementRow["statement"]>, action: "CLOSED" | "PAID") => void;
};

export const paymentActionKey = (statementId: string, action: "CLOSED" | "PAID") => `${statementId}:${action}`;

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

export function UpcomingPayments({ statements, cards, cardSummaries, selectedOwner, pendingActions, onPaymentAction }: UpcomingPaymentsProps) {
  const groups = buildDueStatementGroups({ statements, cards, cardSummaries });
  const overdueRows = buildOverdueStatementRows({ statements, cards, cardSummaries });

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
          <PaymentRows rows={overdueRows} compact pendingActions={pendingActions} onPaymentAction={onPaymentAction} />
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
          <PaymentRows rows={group.rows} pendingActions={pendingActions} onPaymentAction={onPaymentAction} />
        </section>
      ))}
    </section>
  );
}

function PaymentRows({
  rows,
  compact = false,
  pendingActions,
  onPaymentAction,
}: {
  rows: DueStatementRow[];
  compact?: boolean;
  pendingActions: ReadonlySet<string>;
  onPaymentAction: UpcomingPaymentsProps["onPaymentAction"];
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border cc-border xl:block">
        <table className="w-full table-fixed border-collapse bg-surface text-sm leading-5">
          <colgroup>
            <col className={compact ? "w-[20%]" : "w-[17%]"} />
            <col className={compact ? "w-[11%]" : "w-[8%]"} />
            <col className={compact ? "w-[9%]" : "w-[11%]"} />
            {!compact && <col className="w-[9%]" />}
            <col className={compact ? "w-[12%]" : "w-[10%]"} />
            <col className={compact ? "w-[13%]" : "w-[12%]"} />
            <col className={compact ? "w-[12%]" : "w-[10%]"} />
            <col className="w-[23%]" />
          </colgroup>
          <thead className="sticky top-0 bg-surface-elevated">
            <tr className="border-b cc-border text-xs font-bold uppercase leading-4 tracking-wide cc-text-muted">
              <th className="px-3 py-2.5 text-left">Thẻ</th>
              <th className="px-3 py-2.5 text-left">Ngân hàng</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-center">Chủ thẻ</th>
              {!compact && <th className="whitespace-nowrap px-2 py-2.5 text-center">Kỳ sao kê</th>}
              <th className="px-2 py-2.5 text-center">Hạn thanh toán</th>
              <th className="px-2 py-2.5 text-right">Số tiền phải trả</th>
              <th className="whitespace-nowrap px-2 py-2.5 text-center">Trạng thái</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, statement, statementDate, dueDate, card, amountDue, status }) => (
              <tr key={key} className="border-b cc-border align-middle text-sm font-medium leading-5 last:border-b-0 hover:bg-surface-elevated">
                <td className="px-3 py-2.5 align-middle font-semibold cc-text-primary">
                  <span className="line-clamp-2" title={getDisplayName(card)}>{getDisplayName(card)}</span>
                </td>
                <td className="px-3 py-2.5 align-middle cc-text-muted">
                  <span className="block truncate" title={getProviderName(card)}>{getProviderName(card)}</span>
                </td>
                <td className="px-2 py-2.5 text-center align-middle">
                  <span className="cc-badge inline-flex max-w-full items-center justify-center rounded-md px-1.5 py-1 text-xs font-semibold" title={card.owner || "Tôi"}>
                    <span className="truncate whitespace-nowrap">{card.owner || "Tôi"}</span>
                  </span>
                </td>
                {!compact && <td className="whitespace-nowrap px-2 py-2.5 text-center align-middle cc-text-muted">{formatDateDisplay(statementDate ?? "")}</td>}
                <td className="whitespace-nowrap px-2 py-2.5 text-center align-middle font-semibold cc-danger">{formatDateDisplay(dueDate)}</td>
                <td className="cc-tabular whitespace-nowrap px-2 py-2.5 text-right align-middle font-semibold cc-text-primary">{formatVnd(amountDue)}</td>
                <td className="px-2 py-2.5 text-center align-middle">
                  <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold leading-4 ${statusClass[status]}`}>
                    {statusLabel[status]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center align-middle">
                  {statement ? <PaymentActions statement={statement} pendingActions={pendingActions} onPaymentAction={onPaymentAction} desktop /> : <span className="text-xs font-semibold cc-text-muted">Mở chi tiết thẻ để cập nhật</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 xl:hidden">
        {rows.map(({ key, statement, statementDate, dueDate, card, amountDue, status }) => (
          <article key={key} className="cc-panel rounded-lg p-4">
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
                <dd className="mt-1 font-bold cc-text-primary">{formatDateDisplay(statementDate ?? "")}</dd>
              </div>
              <div className="text-right">
                <dt className="font-semibold cc-text-muted">Hạn thanh toán</dt>
                <dd className="mt-1 font-bold cc-danger">{formatDateDisplay(dueDate)}</dd>
              </div>
              <div className="col-span-2 text-right">
                <dt className="font-semibold cc-text-muted">Số tiền phải trả</dt>
                <dd className="cc-tabular mt-1 text-lg font-bold cc-text-primary">{formatVnd(amountDue)}</dd>
              </div>
            </dl>
            <div className="mt-4 border-t cc-border pt-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide cc-text-muted">Thao tác</p>
              {statement ? <PaymentActions statement={statement} pendingActions={pendingActions} onPaymentAction={onPaymentAction} /> : <p className="text-center text-xs font-semibold cc-text-muted">Mở chi tiết thẻ để cập nhật kỳ thanh toán.</p>}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function PaymentActions({ statement, pendingActions, onPaymentAction, desktop = false }: {
  statement: NonNullable<DueStatementRow["statement"]>;
  pendingActions: ReadonlySet<string>;
  onPaymentAction: UpcomingPaymentsProps["onPaymentAction"];
  desktop?: boolean;
}) {
  const closePending = pendingActions.has(paymentActionKey(statement._id, "CLOSED"));
  const paidPending = pendingActions.has(paymentActionKey(statement._id, "PAID"));
  const rowPending = closePending || paidPending;
  const closed = statement.paymentStatus === "STATEMENT_CLOSED" || statement.effectivePaymentStatus === "STATEMENT_CLOSED";
  const paid = statement.paymentStatus === "PAID" || statement.effectivePaymentStatus === "PAID";
  const hasAmountDue = Number(statement.summary?.totalAmountDue ?? 0) > 0;

  return (
    <div className={desktop ? "grid grid-cols-1 gap-2" : "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center"}>
      <button type="button" disabled={rowPending || closed || paid} onClick={() => onPaymentAction(statement, "CLOSED")} className={`${desktop ? "h-9 w-full whitespace-nowrap" : ""} inline-flex items-center justify-center rounded-lg border border-blue-300 px-3 py-2 text-center text-xs font-bold leading-4 text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60`}>
        {closePending ? "Đang chốt..." : closed ? "Đã chốt" : "Chốt sao kê"}
      </button>
      <button type="button" disabled={rowPending || paid || !hasAmountDue} onClick={() => onPaymentAction(statement, "PAID")} className={`${desktop ? "h-9 w-full whitespace-nowrap" : ""} inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-center text-xs font-bold leading-4 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60`}>
        {paidPending ? "Đang cập nhật..." : paid ? "Đã thanh toán" : "Đánh dấu đã thanh toán"}
      </button>
    </div>
  );
}
