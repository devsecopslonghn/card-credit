"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CardImage } from "@/components/cards/CardImage";
import { TransactionFormModal } from "@/components/cards/TransactionFormModal";
import {
  formatAnnualFee,
  formatDateDisplay,
  formatRateBps,
  formatVnd,
  getDisplayName,
  getNetwork,
  getProviderName,
  type CreditCardView,
} from "@/components/cards/cardTypes";
import { fetchCard, updateCardOperational } from "@/lib/api/cardsClient";
import {
  deleteTransaction,
  fetchCardStatements,
  fetchStatementDetail,
  sendStatementCalendarEmail,
  updateStatementPayment,
  updateTransaction,
  updateTransactionCashback,
  type CardStatementView,
  type CardTransactionView,
  type CashbackStatus,
  type TransactionPayload,
} from "@/lib/api/transactionsClient";
import { canEmailStatementCalendar } from "@/lib/api/statementCalendarEmailCore.mjs";
import { summarizeCardDebt } from "@/lib/cards/cardDebtCore.mjs";

type Toast = { message: string; type: "success" | "error" };

const statusLabel: Record<string, string> = {
  OPEN: "Đang mở",
  STATEMENT_CLOSED: "Đã chốt sao kê",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn",
};

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [card, setCard] = useState<CreditCardView | null>(null);
  const [statements, setStatements] = useState<CardStatementView[]>([]);
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [statementDetail, setStatementDetail] = useState<CardStatementView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailingStatementId, setEmailingStatementId] = useState("");
  const emailRequestPending = useRef(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<CardTransactionView | null>(null);
  const [transactionError, setTransactionError] = useState("");
  const [configForm, setConfigForm] = useState({
    statementDay: 1,
    paymentDueDays: 15,
    annualFeeWaiverTarget: 0,
    cashbackCapAmount: null as number | null,
    cashbackCapPeriod: "STATEMENT" as "STATEMENT" | "CALENDAR_MONTH",
    active: true,
  });

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const loadCard = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [loadedCard, loadedStatements] = await Promise.all([
        fetchCard(resolvedParams.id),
        fetchCardStatements(resolvedParams.id),
      ]);
      setCard(loadedCard);
      setConfigForm({
        statementDay: loadedCard.statementDay ?? 1,
        paymentDueDays: loadedCard.paymentDueDays ?? 15,
        annualFeeWaiverTarget: loadedCard.annualFeeWaiverTarget ?? loadedCard.targetSpendForWaiver ?? 0,
        cashbackCapAmount: loadedCard.cashbackCapAmount ?? null,
        cashbackCapPeriod: loadedCard.cashbackCapPeriod ?? "STATEMENT",
        active: loadedCard.active !== false,
      });
      setStatements(loadedStatements);
      const nextSelected = selectedStatementId || loadedStatements[0]?._id || "";
      setSelectedStatementId(nextSelected);
      if (nextSelected) setStatementDetail(await fetchStatementDetail(resolvedParams.id, nextSelected));
      else setStatementDetail(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không thể tải dữ liệu thẻ.");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, selectedStatementId]);

  const loadStatementDetail = useCallback(
    async (statementId: string) => {
      if (!statementId) {
        setStatementDetail(null);
        return;
      }
      setStatementDetail(await fetchStatementDetail(resolvedParams.id, statementId));
    },
    [resolvedParams.id],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadCard(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadCard]);

  const selectedStatement = useMemo(
    () => statements.find((statement) => statement._id === selectedStatementId) ?? null,
    [selectedStatementId, statements],
  );
  const debtSummary = useMemo(() => summarizeCardDebt(statements), [statements]);

  const refreshAfterMutation = async () => {
    const loadedStatements = await fetchCardStatements(resolvedParams.id);
    setStatements(loadedStatements);
    if (selectedStatementId) setStatementDetail(await fetchStatementDetail(resolvedParams.id, selectedStatementId));
  };

  const handlePaymentAction = async (statement: CardStatementView, action: "PAID" | "REOPEN" | "CLOSED") => {
    const message =
      action === "REOPEN"
        ? "Mở lại kỳ sao kê sẽ xóa trạng thái thanh toán, paidAt và paidAmount. Bạn muốn tiếp tục?"
        : action === "CLOSED"
          ? "Chốt kỳ sao kê này? Sau khi chốt, sửa/xóa giao dịch vẫn được phép nhưng sẽ có cảnh báo tính lại số liệu."
          : "Đánh dấu kỳ sao kê này đã thanh toán?";
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      const updated = await updateStatementPayment(resolvedParams.id, statement._id, action);
      setStatements((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      await loadStatementDetail(statement._id);
      showToast(action === "REOPEN" ? "Đã mở lại kỳ sao kê." : action === "CLOSED" ? "Đã chốt kỳ sao kê." : "Đã đánh dấu thanh toán.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể cập nhật kỳ sao kê.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCalendarEmail = async (statement: CardStatementView) => {
    if (emailRequestPending.current) return;
    emailRequestPending.current = true;
    setEmailingStatementId(statement._id);
    try {
      const result = await sendStatementCalendarEmail(resolvedParams.id, statement._id);
      showToast(`Đã gửi file lịch tới ${result.data.recipient}`);
    } catch {
      showToast("Không thể gửi file lịch. Vui lòng thử lại sau.", "error");
    } finally {
      emailRequestPending.current = false;
      setEmailingStatementId("");
    }
  };

  const handleTransactionSubmit = async (payload: TransactionPayload, warning: string) => {
    if (!editingTransaction) return;
    if (warning && !window.confirm(warning)) return;
    setBusy(true);
    setTransactionError("");
    try {
      await updateTransaction(editingTransaction._id, payload);
      setEditingTransaction(null);
      await refreshAfterMutation();
      showToast("Đã cập nhật giao dịch.");
    } catch (error) {
      setTransactionError(error instanceof Error ? error.message : "Không thể cập nhật giao dịch.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTransaction = async (transaction: CardTransactionView) => {
    if (statementDetail?.paymentStatus === "PAID") {
      showToast("Kỳ sao kê đã thanh toán. Hãy mở lại kỳ sao kê trước khi xóa giao dịch.", "error");
      return;
    }
    const warning =
      statementDetail?.paymentStatus === "STATEMENT_CLOSED"
        ? "Kỳ sao kê đã đóng. Xóa giao dịch sẽ tính lại tổng sao kê, hạn thanh toán và lợi nhuận. Bạn muốn tiếp tục?"
        : "Xóa giao dịch này?";
    if (!window.confirm(warning)) return;
    setBusy(true);
    try {
      await deleteTransaction(transaction._id);
      await refreshAfterMutation();
      showToast("Đã xóa giao dịch.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể xóa giao dịch.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCashbackChange = async (transaction: CardTransactionView, cashbackStatus: CashbackStatus, amount: number) => {
    if (statementDetail?.paymentStatus === "PAID") {
      showToast("Kỳ sao kê đã thanh toán. Hãy mở lại kỳ sao kê trước khi cập nhật cashback.", "error");
      return;
    }
    setBusy(true);
    try {
      await updateTransactionCashback(transaction._id, {
        cashbackStatus,
        actualCashbackAmount: cashbackStatus === "RECEIVED" ? amount : undefined,
      });
      await refreshAfterMutation();
      showToast("Đã cập nhật cashback.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể cập nhật cashback.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    if (configForm.statementDay < 1 || configForm.statementDay > 31) {
      showToast("Ngày chốt sao kê phải từ 1 đến 31.", "error");
      return;
    }
    if (configForm.paymentDueDays < 1) {
      showToast("Số ngày đến hạn thanh toán phải lớn hơn 0.", "error");
      return;
    }
    if (configForm.cashbackCapAmount !== null && configForm.cashbackCapAmount < 0) {
      showToast("Cashback Cap phải lớn hơn hoặc bằng 0, hoặc để trống nếu không giới hạn.", "error");
      return;
    }
    setBusy(true);
    try {
      const updated = await updateCardOperational(resolvedParams.id, configForm);
      setCard(updated);
      showToast("Đã cập nhật cấu hình thẻ.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể cập nhật cấu hình thẻ.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="cc-page p-10 text-center cc-text-muted">Đang tải dữ liệu thẻ...</div>;

  if (loadError || !card) {
    return (
      <div className="cc-page px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-700">{loadError || "Không tìm thấy thẻ."}</p>
          <button type="button" onClick={loadCard} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  const providerName = getProviderName(card);
  const displayName = getDisplayName(card);
  const network = getNetwork(card);
  const summary = statementDetail?.summary;
  const cashbackCap = summary?.cashbackCap ?? {
    capAmount: statementDetail?.cashbackCapAmount ?? null,
    unlimited: statementDetail?.cashbackCapAmount == null,
    capUsedPercent:
      statementDetail?.cashbackCapAmount == null
        ? null
        : statementDetail.cashbackCapAmount > 0
          ? Math.round((summary?.eligibleCashback ?? 0) * 10000 / statementDetail.cashbackCapAmount) / 100
          : 100,
  };

  return (
    <div className="cc-page px-4 py-10 md:px-8">
      {toast && (
        <div role={toast.type === "success" ? "status" : "alert"} className={`fixed bottom-6 right-6 z-[100] max-w-[calc(100vw-2rem)] rounded-xl px-5 py-3.5 font-medium text-white shadow-2xl ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        <Link href="/cards" className="mb-6 inline-flex items-center gap-2 font-medium text-blue-600 hover:underline">
          &larr; Quay lại danh sách thẻ
        </Link>

        <section className="cc-section mb-8 p-6" aria-labelledby="card-detail-title">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="cc-panel flex flex-col items-center justify-center p-4">
              <CardImage
                src={card.imageUrl}
                alt={`${providerName} ${displayName}`}
                sizes="288px"
                className="mb-3 h-32 w-full object-contain"
              />
              <p className="text-sm font-semibold cc-text-muted">{providerName}</p>
              <h1 id="card-detail-title" className="text-center text-xl font-bold cc-text">{displayName}</h1>
              <p className="mt-1 text-sm text-blue-700">{network} · {card.owner || "Tôi"}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatBox label="Đang nợ ngân hàng" value={formatVnd(debtSummary.totalOutstanding)} color="cc-danger" />
              <StatBox label="Cần thanh toán tháng này" value={formatVnd(debtSummary.currentMonthDue)} hint={`${debtSummary.currentMonthDueCount} kỳ`} color="cc-danger" />
              <StatBox label="Cần thanh toán tháng kế tiếp" value={formatVnd(debtSummary.nextMonthDue)} hint={`${debtSummary.nextMonthDueCount} kỳ`} />
              <StatBox label="Phí thường niên snapshot" value={formatAnnualFee(card.annualFee)} />
              <StatBox label="Ngày chốt sao kê" value={`Ngày ${card.statementDay ?? 1}`} />
              <StatBox label="Hạn thanh toán" value={`+${card.paymentDueDays ?? 15} ngày`} />
              <StatBox label="Trạng thái thẻ" value={card.active === false ? "Ngưng dùng" : "Đang dùng"} />
              <StatBox label="Doanh số miễn PTN" value={formatVnd(card.annualFeeWaiverTarget ?? card.targetSpendForWaiver ?? 0)} />
              <StatBox label="Cashback Cap" value={card.cashbackCapAmount == null ? "Không giới hạn" : formatVnd(card.cashbackCapAmount)} />
            </div>
          </div>
        </section>

        <section className="cc-section mb-8 p-6" aria-labelledby="card-config-title">
          <h2 id="card-config-title" className="mb-4 text-xl font-bold cc-text">Cấu hình thẻ</h2>
          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <NumberField label="Ngày chốt sao kê" value={configForm.statementDay} min={1} max={31} onChange={(value) => setConfigForm((current) => ({ ...current, statementDay: value }))} />
            <NumberField label="Số ngày đến hạn" value={configForm.paymentDueDays} min={1} onChange={(value) => setConfigForm((current) => ({ ...current, paymentDueDays: value }))} />
            <NumberField label="Mục tiêu miễn PTN" value={configForm.annualFeeWaiverTarget} min={0} onChange={(value) => setConfigForm((current) => ({ ...current, annualFeeWaiverTarget: value }))} />
            <NullableNumberField label="Cashback Cap" value={configForm.cashbackCapAmount} onChange={(value) => setConfigForm((current) => ({ ...current, cashbackCapAmount: value }))} />
            <label className="block text-sm font-semibold cc-text-muted">
              <span className="mb-1 block">Chu kỳ Cashback Cap</span>
              <select value={configForm.cashbackCapPeriod} onChange={(event) => setConfigForm((current) => ({ ...current, cashbackCapPeriod: event.target.value as "STATEMENT" | "CALENDAR_MONTH" }))} className="cc-control w-full rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="STATEMENT">Kỳ sao kê</option>
                <option value="CALENDAR_MONTH" disabled>Tháng dương lịch</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold cc-text-muted" style={{ borderColor: "var(--border)" }}>
              <input type="checkbox" checked={configForm.active} onChange={(event) => setConfigForm((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Đang sử dụng
            </label>
            <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              Lưu cấu hình
            </button>
          </form>
        </section>

        <section className="cc-section mb-8 p-6" aria-labelledby="statement-list-title">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <h2 id="statement-list-title" className="text-xl font-bold cc-text">Kỳ sao kê</h2>
            {statements.length > 0 && (
              <select value={selectedStatementId} onChange={(event) => { setSelectedStatementId(event.target.value); void loadStatementDetail(event.target.value); }} className="cc-control rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500">
                {statements.map((statement) => (
                  <option key={statement._id} value={statement._id}>
                    {formatDateDisplay(statement.statementDate)} · {statusLabel[statement.effectivePaymentStatus]}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!statementDetail || !selectedStatement || !summary ? (
            <p className="rounded-lg border border-dashed p-6 text-center cc-text-muted" style={{ borderColor: "var(--border)" }}>Chưa có kỳ sao kê. Hãy tạo giao dịch từ lịch chi tiêu.</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatBox label="Bắt đầu kỳ" value={formatDateDisplay(statementDetail.periodStartDate)} />
                <StatBox label="Chốt sao kê" value={formatDateDisplay(statementDetail.statementDate)} />
                <StatBox label="Hạn thanh toán" value={formatDateDisplay(statementDetail.paymentDueDate)} />
                <StatBox label="Trạng thái" value={statusLabel[statementDetail.effectivePaymentStatus]} />
                <StatBox label="Tổng phải trả ngân hàng" value={formatVnd(summary.totalAmountDue)} color="text-red-600" />
                <StatBox label="Tổng đối tác hoàn" value={formatVnd(summary.totalIncome)} color="text-emerald-600" />
                <StatBox label="Phí dịch vụ" value={formatVnd(summary.totalServiceFee)} color="text-orange-600" />
                <StatBox label="Cashback Cap kỳ này" value={cashbackCap.unlimited ? "Không giới hạn" : formatVnd(cashbackCap.capAmount)} />
                <StatBox label="Cashback theo tỷ lệ" value={formatVnd(summary.cashbackByRate)} color="text-emerald-600" />
                <StatBox label="Cashback được hưởng/đã dùng kỳ này" value={formatVnd(summary.eligibleCashback)} color="text-emerald-600" />
                <StatBox label="Cashback thực nhận" value={formatVnd(summary.actualCashback)} color="text-emerald-600" />
                <StatBox label="Cashback vượt giới hạn" value={formatVnd(summary.exceededCashback)} color="text-red-600" />
                <StatBox label="Cashback còn lại kỳ này" value={summary.remainingCashback === null ? "Không giới hạn" : formatVnd(summary.remainingCashback)} />
                <StatBox label="% đã dùng Cashback Cap kỳ này" value={cashbackCap.capUsedPercent === null ? "Không giới hạn" : `${cashbackCap.capUsedPercent}%`} />
                <StatBox label="Lợi nhuận dự kiến" value={formatVnd(summary.expectedNetProfit)} color={summary.expectedNetProfit >= 0 ? "text-emerald-600" : "text-red-600"} />
                <StatBox label="Lợi nhuận thực nhận" value={formatVnd(summary.actualNetProfit)} color={summary.actualNetProfit >= 0 ? "text-emerald-600" : "text-red-600"} />
                <StatBox label="Doanh số miễn PTN" value={formatVnd(summary.annualEligibleSpend)} />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                {canEmailStatementCalendar(statementDetail) && (
                  <div className="mr-auto max-w-md">
                    <button type="button" disabled={emailingStatementId === statementDetail._id} onClick={() => void handleCalendarEmail(statementDetail)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                      {emailingStatementId === statementDetail._id ? "Đang gửi..." : "Gửi lịch qua email"}
                    </button>
                    <p className="mt-2 text-xs cc-text-muted">File .ics sẽ được gửi tới email tài khoản của bạn để nhập một lần vào ứng dụng lịch.</p>
                  </div>
                )}
                {statementDetail.paymentStatus === "PAID" ? (
                  <button type="button" disabled={busy} onClick={() => handlePaymentAction(statementDetail, "REOPEN")} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-60">
                    Mở lại kỳ sao kê
                  </button>
                ) : (
                  <>
                    {statementDetail.paymentStatus === "OPEN" && (
                      <button type="button" disabled={busy} onClick={() => handlePaymentAction(statementDetail, "CLOSED")} className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 disabled:opacity-60">
                        Chốt sao kê
                      </button>
                    )}
                    <button type="button" disabled={busy} onClick={() => handlePaymentAction(statementDetail, "PAID")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                      Đánh dấu đã thanh toán
                    </button>
                  </>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left font-semibold text-gray-500">
                      <th className="p-3">Ngày</th>
                      <th className="p-3">Giao dịch</th>
                      <th className="p-3 text-right">Outcome</th>
                      <th className="p-3 text-right">Income</th>
                      <th className="p-3 text-right">Cashback theo tỷ lệ</th>
                      <th className="p-3 text-right">Lợi nhuận</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statementDetail.transactions ?? []).map((transaction) => (
                      <tr key={transaction._id} className="border-b border-gray-100">
                        <td className="p-3 font-medium text-gray-900">{formatDateDisplay(transaction.transactionDate)}</td>
                        <td className="max-w-xs p-3 text-gray-700">
                          <p className="break-words">{transaction.note || "Không có ghi chú"}</p>
                          <p className="text-xs text-gray-500">{formatRateBps(transaction.partnerReturnRateBps)} đối tác · {formatRateBps(transaction.cashbackRateBps)} cashback</p>
                        </td>
                        <td className="p-3 text-right font-semibold">{formatVnd(transaction.outcomeAmount)}</td>
                        <td className="p-3 text-right">{formatVnd(transaction.incomeAmount)}</td>
                        <td className="p-3 text-right">{formatVnd(transaction.derived.expectedCashbackAmount)}</td>
                        <td className={`p-3 text-right font-semibold ${transaction.derived.expectedNetProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatVnd(transaction.derived.expectedNetProfit)}</td>
                        <td className="p-3">
                          <select disabled={busy || statementDetail.paymentStatus === "PAID"} value={transaction.cashbackStatus} onChange={(event) => handleCashbackChange(transaction, event.target.value as CashbackStatus, transaction.actualCashbackAmount ?? transaction.derived.expectedCashbackAmount)} className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold">
                            <option value="PENDING">Pending</option>
                            <option value="RECEIVED">Received</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </td>
                        <td className="p-3 text-right">
                          <button type="button" disabled={busy || statementDetail.paymentStatus === "PAID"} onClick={() => setEditingTransaction(transaction)} className="mr-2 rounded px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">Sửa</button>
                          <button type="button" disabled={busy || statementDetail.paymentStatus === "PAID"} onClick={() => handleDeleteTransaction(transaction)} className="rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <TransactionFormModal
          key={editingTransaction?._id ?? "transaction-form"}
          open={Boolean(editingTransaction)}
          date={editingTransaction?.transactionDate ?? ""}
          cards={[card]}
          statements={statements}
          transaction={editingTransaction}
          submitting={busy}
          error={transactionError}
          onClose={() => setEditingTransaction(null)}
          onSubmit={handleTransactionSubmit}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value, color = "cc-text", hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div className="cc-panel p-4">
      <p className="mb-1 text-xs font-semibold cc-text-muted">{label}</p>
      <p className={`break-words text-lg font-bold cc-tabular ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs font-medium cc-text-subtle">{hint}</p>}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm font-semibold cc-text-muted">
      <span className="mb-1 block">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || min)}
        className="cc-control w-full rounded-lg px-3 py-2 text-right outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function NullableNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block text-sm font-semibold cc-text-muted">
      <span className="mb-1 block">{label}</span>
      <input
        type="number"
        min={0}
        value={value ?? ""}
        placeholder="Không giới hạn"
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value) || 0)}
        className="cc-control w-full rounded-lg px-3 py-2 text-right outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
