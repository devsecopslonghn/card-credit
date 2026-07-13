"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { AddCardModal } from "@/components/cards/AddCardModal";
import { CalendarTransactions } from "@/components/cards/CalendarTransactions";
import { CardList } from "@/components/cards/CardList";
import { DuplicateResolver } from "@/components/cards/DuplicateResolver";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { TransactionFormModal } from "@/components/cards/TransactionFormModal";
import { UpcomingPayments, paymentActionKey } from "@/components/cards/UpcomingPayments";
import type { DueStatementRow } from "@/lib/cards/dueStatementsCore.mjs";
import { loadDashboardResources } from "@/lib/cards/dashboardLoadCore.mjs";
import {
  buildCardSummary,
  filterCardsByOwner,
  getDisplayName,
  getUniqueOwners,
  groupCardsByProvider,
  type CreditCardView,
} from "@/components/cards/cardTypes";
import { deleteCard, fetchCards } from "@/lib/api/cardsClient";
import {
  createTransaction,
  fetchAllCardStatements,
  fetchTransactions,
  updateTransaction,
  updateStatementPayment,
  type CardStatementView,
  type CardTransactionView,
  type TransactionPayload,
} from "@/lib/api/transactionsClient";

type Toast = { message: string; type: "success" | "error" };

export default function CardsPage() {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [cards, setCards] = useState<CreditCardView[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState("");
  const [statementsError, setStatementsError] = useState("");
  const [transactions, setTransactions] = useState<CardTransactionView[]>([]);
  const [statements, setStatements] = useState<CardStatementView[]>([]);
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  const [transactionFormDate, setTransactionFormDate] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<CardTransactionView | null>(null);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCardView | null>(null);
  const [busyCardId, setBusyCardId] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [duplicateRefreshKey, setDuplicateRefreshKey] = useState(0);
  const [pendingPaymentActions, setPendingPaymentActions] = useState<Set<string>>(() => new Set());
  const pendingPaymentActionsRef = useRef(new Set<string>());
  const [calendarPeriod, setCalendarPeriod] = useState(() => {
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

  const loadCardTransactions = useCallback(async () => {
    try {
      setTransactions(await fetchTransactions());
    } catch (error) {
      console.error("Lỗi tải giao dịch", error);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCards();
      void loadCardTransactions();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadCardTransactions, loadCards]);

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

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    requestAnimationFrame(() => addButtonRef.current?.focus());
  }, []);

  const reloadTransactionData = useCallback(async () => {
    await Promise.all([loadCards(), loadCardTransactions()]);
  }, [loadCardTransactions, loadCards]);

  const openTransactionForm = (date: string, transaction: CardTransactionView | null = null) => {
    setTransactionFormDate(date);
    setEditingTransaction(transaction);
    setTransactionError("");
  };

  const handleTransactionSubmit = async (payload: TransactionPayload, warning: string) => {
    if (warning && !window.confirm(warning)) return;
    setTransactionSubmitting(true);
    setTransactionError("");
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction._id, payload);
        showToast("Đã cập nhật giao dịch.");
      } else {
        await createTransaction(payload);
        showToast("Đã tạo giao dịch.");
      }
      setTransactionFormDate("");
      setEditingTransaction(null);
      await reloadTransactionData();
    } catch (error) {
      setTransactionError(error instanceof Error ? error.message : "Không thể lưu giao dịch.");
    } finally {
      setTransactionSubmitting(false);
    }
  };

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

  const handlePaymentAction = async (statement: DueStatementRow["statement"], action: "CLOSED" | "PAID") => {
    const key = paymentActionKey(statement._id, action);
    if (pendingPaymentActionsRef.current.has(key)) return;
    if (action === "CLOSED" && !window.confirm("Chốt kỳ sao kê này? Sau khi chốt, sửa/xóa giao dịch vẫn được phép nhưng sẽ có cảnh báo tính lại số liệu.")) return;

    pendingPaymentActionsRef.current.add(key);
    setPendingPaymentActions(new Set(pendingPaymentActionsRef.current));
    try {
      const updated = await updateStatementPayment(statement.userCardId, statement._id, action);
      setStatements((current) => current.map((item) => (item._id === updated._id ? updated : item)));
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
        <header className="cc-section mb-8 flex flex-col items-start justify-between gap-4 rounded-xl p-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold cc-text-primary">Thẻ Tín Dụng</h1>
            <p className="mt-1 font-medium cc-text-muted">
              Số lượng thẻ hiển thị: {filteredCards.length} / {cards.length}
            </p>
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
            <a
              href="/api/reports/summary"
              target="_blank"
              rel="noopener noreferrer"
              className="cc-control flex w-full justify-center rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-surface-elevated sm:w-auto"
            >
              Xuất JSON
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

        <CalendarTransactions
          transactions={transactions}
          currentYear={calendarPeriod.year}
          currentMonth={calendarPeriod.month}
          onPeriodChange={setCalendarPeriod}
          onAdd={(date) => openTransactionForm(date)}
          onEdit={(transaction) => openTransactionForm(transaction.transactionDate, transaction)}
        />
        {statementsError && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4" role="alert">
            <p className="font-semibold text-amber-900">{statementsError}</p>
            <p className="mt-1 text-sm text-amber-800">Danh sách thẻ vẫn khả dụng, nhưng số dư và kỳ thanh toán tạm thời chưa đầy đủ.</p>
            <button type="button" onClick={() => void loadCards()} className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white">
              Tải lại dữ liệu thẻ
            </button>
          </div>
        )}
        <UpcomingPayments statements={dashboardStatements} cards={cards} selectedOwner={selectedOwner} pendingActions={pendingPaymentActions} onPaymentAction={handlePaymentAction} />
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

        <TransactionFormModal
          key={editingTransaction?._id ?? transactionFormDate}
          open={Boolean(transactionFormDate)}
          date={transactionFormDate}
          cards={cards.filter((card) => card.active !== false)}
          statements={statements}
          transaction={editingTransaction}
          submitting={transactionSubmitting}
          error={transactionError}
          onClose={() => {
            setTransactionFormDate("");
            setEditingTransaction(null);
          }}
          onSubmit={handleTransactionSubmit}
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
