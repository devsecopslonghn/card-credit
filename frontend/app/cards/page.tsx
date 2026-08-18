"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { AddCardModal } from "@/components/cards/AddCardModal";
import { CardList } from "@/components/cards/CardList";
import { DuplicateResolver } from "@/components/cards/DuplicateResolver";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { UpcomingPayments, paymentActionKey } from "@/components/cards/UpcomingPayments";
import { DebtLedger } from "@/components/cards/DebtLedger";
import type { DueStatementRow } from "@/lib/cards/dueStatementsCore.mjs";
import { loadDashboardResources } from "@/lib/cards/dashboardLoadCore.mjs";
import {
  buildCardSummary,
  filterCardsByOwner,
  getDisplayName,
  formatVnd,
  getUniqueOwners,
  groupCardsByProvider,
  type CreditCardView,
} from "@/components/cards/cardTypes";
import { deleteCard, fetchCards } from "@/lib/api/cardsClient";
import { fetchMonthlyCashFlow, type MonthlyCashFlow } from "@/lib/api/cashFlowClient";
import { listFinanceAccounts, type FinanceAccount } from "@/lib/api/financeClient";
import {
  fetchAllCardStatements,
  createStatementPaymentKey,
  previewStatementPayment,
  updateStatementPayment,
  type CardStatementView,
} from "@/lib/api/statementsClient";

type Toast = { message: string; type: "success" | "error" };

export default function CardsPage() {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [cards, setCards] = useState<CreditCardView[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState("");
  const [statementsError, setStatementsError] = useState("");
  const [statements, setStatements] = useState<CardStatementView[]>([]);
  const [repaymentAccounts, setRepaymentAccounts] = useState<FinanceAccount[]>([]);
  const [repaymentAccountId, setRepaymentAccountId] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCardView | null>(null);
  const [busyCardId, setBusyCardId] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [duplicateRefreshKey, setDuplicateRefreshKey] = useState(0);
  const [pendingPaymentActions, setPendingPaymentActions] = useState<Set<string>>(() => new Set());
  const [monthlyCashFlow, setMonthlyCashFlow] = useState<MonthlyCashFlow[]>([]);
  const pendingPaymentActionsRef = useRef(new Set<string>());
  const paymentCommandKeysRef = useRef(new Map<string, string>());
  const [calendarPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const loadCards = useCallback(async () => {
    setCardsLoading(true);
    setCardsError("");
    setStatementsError("");
    try {
      const result = await loadDashboardResources({
        loadCards: fetchCards,
        loadStatements: fetchAllCardStatements,
      });
      setCards(result.cards);
      setStatements(result.statements);
      setCardsError(result.cardsError);
      setStatementsError(result.statementsError);
    } finally {
      setCardsLoading(false);
    }
  }, []);

  const refreshCardsAndDuplicates = useCallback(() => {
    setDuplicateRefreshKey((current) => current + 1);
    void loadCards();
  }, [loadCards]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCards();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadCards]);

  useEffect(() => {
    void listFinanceAccounts().then((items) => {
      const realMoney = items.filter((item) => item.active && item.group === "REAL_MONEY");
      setRepaymentAccounts(realMoney);
      setRepaymentAccountId((current) => current || realMoney[0]?.id || "");
    }).catch(() => setRepaymentAccounts([]));
  }, []);

  useEffect(() => {
    const period = `${calendarPeriod.year}-${String(calendarPeriod.month + 1).padStart(2, "0")}`;
    void fetchMonthlyCashFlow(period).then(setMonthlyCashFlow).catch(() => setMonthlyCashFlow([]));
  }, [calendarPeriod.month, calendarPeriod.year]);

  const ownerOptions = useMemo(() => getUniqueOwners(cards), [cards]);
  const filteredCards = useMemo(() => filterCardsByOwner(cards, selectedOwner), [cards, selectedOwner]);
  const providerGroups = useMemo(() => groupCardsByProvider(filteredCards), [filteredCards]);
  const filteredCardIds = useMemo(() => new Set(filteredCards.map((card) => card._id)), [filteredCards]);
  const statementsByCardId = useMemo(() => {
    const groups = new Map<string, CardStatementView[]>();
    for (const statement of statements) {
      const cardStatements = groups.get(statement.userCardId) ?? [];
      cardStatements.push(statement);
      groups.set(statement.userCardId, cardStatements);
    }
    return groups;
  }, [statements]);
  const cardSummaries = useMemo(
    () =>
      Object.fromEntries(
        cards.map((card) => [
          card._id,
          buildCardSummary(card, statementsByCardId.get(card._id) ?? [], {
            year: calendarPeriod.year,
            month: calendarPeriod.month + 1,
          }),
        ]),
      ),
    [calendarPeriod.month, calendarPeriod.year, cards, statementsByCardId],
  );
  const dashboardStatements = useMemo(
    () => statements.filter((statement) => filteredCardIds.has(statement.userCardId)),
    [filteredCardIds, statements],
  );
  const dashboardTotals = useMemo(() => {
    const summaries = filteredCards.map((card) => cardSummaries[card._id]).filter(Boolean);
    const totalDebt = summaries.reduce((total, summary) => total + summary.totalGrossDebt, 0);
    const paidDebt = summaries.reduce((total, summary) => total + summary.totalPaidDebt, 0);
    const currentDebt = summaries.reduce((total, summary) => total + summary.currentOutstandingBalance, 0);
    const amountDue = dashboardStatements.reduce((total, statement) => {
      if (statement.paymentStatus === "PAID" || statement.effectivePaymentStatus === "PAID") return total;
      return total + Number(statement.summary?.outstandingAmount ?? 0);
    }, 0);
    return { totalDebt, paidDebt, currentDebt, amountDue };
  }, [cardSummaries, dashboardStatements, filteredCards]);
  const reportExportUrl = useMemo(() => {
    const from = `${calendarPeriod.year}-${String(calendarPeriod.month + 1).padStart(2, "0")}-01`;
    const to = new Date().toISOString().slice(0, 10);
    return `/api/financial-reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  }, [calendarPeriod.month, calendarPeriod.year]);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    requestAnimationFrame(() => addButtonRef.current?.focus());
  }, []);

  const executeDelete = async () => {
    if (!cardToDelete) return;
    setBusyCardId(cardToDelete._id);
    try {
      await deleteCard(cardToDelete._id);
      setCards((current) => current.filter((card) => card._id !== cardToDelete._id));
      setDuplicateRefreshKey((current) => current + 1);
      setCardToDelete(null);
      showToast("Đã xóa thẻ khỏi hệ thống.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể xóa thẻ.", "error");
    } finally {
      setBusyCardId("");
    }
  };

  const handlePaymentAction = async (statement: NonNullable<DueStatementRow["statement"]>, action: "CLOSED" | "PAID") => {
    const key = paymentActionKey(statement._id, action);
    if (pendingPaymentActionsRef.current.has(key)) return;
    pendingPaymentActionsRef.current.add(key);
    setPendingPaymentActions(new Set(pendingPaymentActionsRef.current));
    try {
      const preview = await previewStatementPayment(statement.userCardId, statement._id, action, repaymentAccountId || undefined);
      if (preview.requiresRepaymentAccount) {
        showToast("Hãy chọn tài khoản DEBIT/CASH/E_WALLET để trả sao kê.", "error");
        return;
      }
      const confirmation = action === "CLOSED"
        ? `Chốt kỳ sao kê này? Số dư hiện tại ${formatVnd(preview.outstandingAmount)}.`
        : `Xác nhận thanh toán ${formatVnd(preview.amountToPay)} cho kỳ sao kê này?`;
      if (!window.confirm(confirmation)) return;
      const commandKey = paymentCommandKeysRef.current.get(key) ?? createStatementPaymentKey();
      paymentCommandKeysRef.current.set(key, commandKey);
      const updated = await updateStatementPayment(statement.userCardId, statement._id, action, preview.repaymentAccountId ?? undefined, commandKey, preview.version ?? undefined, preview);
      setStatements((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      paymentCommandKeysRef.current.delete(key);
      showToast(action === "CLOSED" ? "Đã chốt kỳ sao kê." : "Đã đánh dấu thanh toán.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể cập nhật kỳ sao kê.", "error");
    } finally {
      pendingPaymentActionsRef.current.delete(key);
      setPendingPaymentActions(new Set(pendingPaymentActionsRef.current));
    }
  };

  return (
    <div className="cc-page min-h-screen overflow-x-hidden px-4 py-10 md:px-8">
      {toast && (
        <div
          role={toast.type === "success" ? "status" : "alert"}
          aria-live={toast.type === "success" ? "polite" : "assertive"}
          className={`fixed bottom-6 right-6 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl px-5 py-3.5 font-medium text-white shadow-2xl ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          <span aria-hidden="true">{toast.type === "success" ? "✓" : "!"}</span>
          <span className="break-words">{toast.message}</span>
        </div>
      )}

      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-1 text-sm font-semibold text-blue-700">TỔNG QUAN</p>
            <h1 className="text-3xl font-semibold tracking-tight cc-text-primary">Thẻ của bạn</h1>
            <p className="mt-1 font-medium cc-text-muted">Kiểm soát dư nợ, sao kê và hạn thanh toán ở một nơi.</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <label htmlFor="owner-filter" className="whitespace-nowrap text-sm font-semibold cc-text-muted">
                Thẻ của:
              </label>
              <select
                id="owner-filter"
                value={selectedOwner}
                onChange={(event) => setSelectedOwner(event.target.value)}
                className="cc-control min-w-40 rounded-lg p-2.5 text-sm font-semibold"
              >
                <option value="">Tất cả thành viên</option>
                {ownerOptions.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>
            <select aria-label="Tài khoản trả nợ" value={repaymentAccountId} onChange={(event) => setRepaymentAccountId(event.target.value)} className="cc-control min-w-48 rounded-lg p-2.5 text-sm font-semibold">
              <option value="">Chọn tài khoản trả nợ</option>
              {repaymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.type}</option>)}
            </select>
            <Link
              href="/reports"
              className="cc-control flex w-full justify-center rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-surface-elevated sm:w-auto"
            >
              Báo cáo
            </Link>
            <a
              href={reportExportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cc-control flex w-full justify-center rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-surface-elevated sm:w-auto"
            >
              Xuất JSON (toàn workspace)
            </a>
            <button
              ref={addButtonRef}
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex w-full justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm outline-none hover:bg-blue-800 focus:ring-2 focus:ring-focus-ring sm:w-auto"
            >
              Thêm thẻ mới
            </button>
            <LogoutButton className="w-full sm:w-auto" />
          </div>
        </header>

        <section className="mb-7 grid gap-4 md:grid-cols-2" aria-label="Tổng quan tài chính">
          <article className="cc-section rounded-xl p-5">
            <p className="text-sm font-medium cc-text-muted">Tổng nợ phát sinh</p>
            <p className="mt-2 text-3xl font-bold tracking-tight cc-text-primary">{formatVnd(dashboardTotals.totalDebt)}</p>
            <p className="mt-2 text-xs font-medium cc-text-subtle">Đã thanh toán {formatVnd(dashboardTotals.paidDebt)} · Còn phải trả {formatVnd(dashboardTotals.currentDebt)}</p>
          </article>
          <article className={`rounded-xl border p-5 shadow-sm ${dashboardTotals.amountDue > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <p className={`text-sm font-bold uppercase tracking-wide ${dashboardTotals.amountDue > 0 ? "text-amber-800" : "text-emerald-800"}`}>Cần thanh toán</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight ${dashboardTotals.amountDue > 0 ? "text-amber-950" : "text-emerald-950"}`}>{formatVnd(dashboardTotals.amountDue)}</p>
            <p className={`mt-2 text-xs font-medium ${dashboardTotals.amountDue > 0 ? "text-amber-800" : "text-emerald-800"}`}>
              {dashboardTotals.amountDue > 0 ? "Kiểm tra các kỳ sao kê bên dưới." : "Tất cả đã ổn thỏa ở thời điểm hiện tại."}
            </p>
          </article>
        </section>

        <section className="cc-section mb-8 p-5" aria-labelledby="cash-flow-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wider text-[#00687a]">DÒNG TIỀN THỰC TẾ</p><h2 id="cash-flow-title" className="mt-1 text-xl font-bold">Tổng quan tháng {calendarPeriod.month + 1}/{calendarPeriod.year}</h2></div>
            <Link href="/fees" className="text-sm font-bold text-[#00687a] hover:underline">Quản lý phí</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">{monthlyCashFlow.filter((item) => !selectedOwner || item.card?.owner === selectedOwner).map((item) => <article key={item.cardId} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}><p className="truncate text-sm font-bold">{item.card?.providerName ?? item.card?.bank ?? "Thẻ"} · {item.card?.displayName ?? item.card?.name ?? item.cardId.slice(-6)}</p><div className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><p className="text-xs cc-text-muted">Tiền Out</p><p className="mt-1 font-bold cc-tabular">{formatVnd(item.totalOut)}</p></div><div><p className="text-xs cc-text-muted">Tiền In</p><p className="mt-1 font-bold text-emerald-600 cc-tabular">{formatVnd(item.totalIn)}</p></div><div><p className="text-xs cc-text-muted">Kết quả</p><p className={`mt-1 font-bold cc-tabular ${item.netResult >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatVnd(item.netResult)}</p></div></div><p className="mt-3 text-xs cc-text-muted">Phí thực tế: {formatVnd(item.actualFees)} · Không có phí thì 0 ₫</p></article>)}{monthlyCashFlow.length === 0 && <p className="text-sm cc-text-muted">Chưa có dữ liệu dòng tiền thực tế cho tháng này.</p>}</div>
        </section>

        {statementsError && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4" role="alert">
            <p className="font-semibold text-amber-900">{statementsError}</p>
            <p className="mt-1 text-sm text-amber-800">Danh sách thẻ vẫn khả dụng, nhưng số dư và kỳ thanh toán tạm thời chưa đầy đủ.</p>
            <button type="button" onClick={() => void loadCards()} className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white">
              Tải lại dữ liệu thẻ
            </button>
          </div>
        )}
        <UpcomingPayments statements={dashboardStatements} cards={filteredCards} cardSummaries={cardSummaries} selectedOwner={selectedOwner} pendingActions={pendingPaymentActions} onPaymentAction={handlePaymentAction} />
        <DebtLedger statements={dashboardStatements} cards={filteredCards} />
        <DuplicateResolver
          refreshKey={duplicateRefreshKey}
          onMerged={refreshCardsAndDuplicates}
          onStatus={showToast}
        />
        <CardList
          loading={cardsLoading}
          error={cardsError}
          cardsCount={cards.length}
          filteredCardsCount={filteredCards.length}
          providerGroups={providerGroups}
          cardSummaries={cardSummaries}
          statementsAvailable={!statementsError}
          selectedOwner={selectedOwner}
          busyCardId={busyCardId}
          onRetry={loadCards}
          onDelete={setCardToDelete}
        />

        <AddCardModal
          open={isAddModalOpen}
          ownerOptions={ownerOptions}
          onClose={closeAddModal}
          onCreated={refreshCardsAndDuplicates}
          onSuccess={(message) => showToast(message)}
        />

        {cardToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="delete-card-title" className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <span className="text-2xl font-bold text-red-600">!</span>
              </div>
              <h3 id="delete-card-title" className="mb-2 text-xl font-bold text-gray-900">
                Xác nhận xóa thẻ?
              </h3>
              <p className="mb-6 text-sm font-medium cc-text-muted">
                Bạn có chắc chắn muốn xóa thẻ <strong>{getDisplayName(cardToDelete)}</strong> không?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCardToDelete(null)}
                  disabled={busyCardId === cardToDelete._id}
                  className="w-full rounded-lg bg-gray-100 px-5 py-2.5 text-gray-700"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  disabled={busyCardId === cardToDelete._id}
                  className="w-full rounded-lg bg-red-600 px-5 py-2.5 text-white disabled:opacity-60"
                >
                  {busyCardId === cardToDelete._id ? "Đang xóa..." : "Đồng ý xóa"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
