"use client";

import { useMemo, useState } from "react";
import {
  formatDateDisplay,
  formatRateBps,
  formatVnd,
  getDisplayName,
  getProviderName,
  type CreditCardView,
} from "@/components/cards/cardTypes";
import type {
  CardStatementView,
  CardTransactionView,
  IncomeInputMode,
  TransactionPayload,
} from "@/lib/api/transactionsClient";

type TransactionFormModalProps = {
  open: boolean;
  date: string;
  cards: CreditCardView[];
  statements: CardStatementView[];
  transaction: CardTransactionView | null;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: TransactionPayload, warning: string) => void;
};

const toBps = (percentText: string) => Math.round((Number(percentText.replace(",", ".")) || 0) * 100);
const fromBps = (bps: number) => String((bps || 0) / 100);
const formatNumberInput = (value: number | "") => (value === "" ? "" : String(value));

const deriveIncomeFromRate = (outcomeAmount: number, rateBps: number) => Math.round((outcomeAmount * rateBps) / 10000);
const deriveRateFromIncome = (outcomeAmount: number, incomeAmount: number) =>
  outcomeAmount > 0 ? Math.round((incomeAmount * 10000) / outcomeAmount) : 0;

const findMatchingStatement = (statements: CardStatementView[], cardId: string, transactionDate: string) =>
  statements.find(
    (statement) =>
      statement.userCardId === cardId &&
      statement.periodStartDate <= transactionDate &&
      transactionDate <= statement.periodEndDate,
  );

export function TransactionFormModal({
  open,
  date,
  cards,
  statements,
  transaction,
  submitting,
  error,
  onClose,
  onSubmit,
}: TransactionFormModalProps) {
  const [transactionDate, setTransactionDate] = useState(transaction?.transactionDate || date);
  const [userCardId, setUserCardId] = useState(transaction?.userCardId || cards[0]?._id || "");
  const [outcomeAmount, setOutcomeAmount] = useState<number | "">(transaction?.outcomeAmount ?? "");
  const [incomeAmount, setIncomeAmount] = useState<number | "">(transaction?.incomeAmount ?? "");
  const [partnerReturnRate, setPartnerReturnRate] = useState(fromBps(transaction?.partnerReturnRateBps ?? 9500));
  const [incomeInputMode, setIncomeInputMode] = useState<IncomeInputMode>(transaction?.incomeInputMode ?? "AMOUNT");
  const [cashbackRate, setCashbackRate] = useState(fromBps(transaction?.cashbackRateBps ?? 0));
  const [eligibleForAnnualFeeWaiver, setEligibleForAnnualFeeWaiver] = useState(transaction?.eligibleForAnnualFeeWaiver ?? true);
  const [note, setNote] = useState(transaction?.note ?? "");
  const [localError, setLocalError] = useState("");

  const numericOutcome = Number(outcomeAmount || 0);
  const numericIncome = Number(incomeAmount || 0);
  const partnerReturnRateBps = toBps(partnerReturnRate);
  const cashbackRateBps = toBps(cashbackRate);
  const expectedCashback = Math.round((numericOutcome * cashbackRateBps) / 10000);
  const serviceFee = numericOutcome - numericIncome;
  const matchingStatement = useMemo(
    () => findMatchingStatement(statements, userCardId, transactionDate),
    [statements, transactionDate, userCardId],
  );
  const selectedCard = cards.find((card) => card._id === userCardId);
  const capAmount = selectedCard?.cashbackCapAmount ?? null;
  const capPeriod = selectedCard?.cashbackCapPeriod ?? "STATEMENT";
  const statementRemaining = matchingStatement?.summary.cashbackCap.remainingCashback;
  const cashbackRemaining = capAmount === null ? null : statementRemaining ?? capAmount;
  const eligibleCashback = cashbackRemaining === null ? expectedCashback : Math.min(expectedCashback, cashbackRemaining);
  const exceededCashback = Math.max(expectedCashback - eligibleCashback, 0);
  const expectedNetProfit = eligibleCashback - serviceFee;
  const capLabel = capPeriod === "CALENDAR_MONTH" ? "Cashback còn lại tháng" : "Cashback còn lại kỳ";

  if (!open) return null;

  const syncIncomeFromRate = (rateText: string, nextOutcome = numericOutcome) => {
    setPartnerReturnRate(rateText);
    setIncomeInputMode("RATE");
    setIncomeAmount(deriveIncomeFromRate(nextOutcome, toBps(rateText)));
  };

  const syncRateFromIncome = (amount: number | "", nextOutcome = numericOutcome) => {
    setIncomeAmount(amount);
    setIncomeInputMode("AMOUNT");
    setPartnerReturnRate(fromBps(deriveRateFromIncome(nextOutcome, Number(amount || 0))));
  };

  const handleOutcomeChange = (value: number | "") => {
    setOutcomeAmount(value);
    const nextOutcome = Number(value || 0);
    if (incomeInputMode === "RATE") {
      setIncomeAmount(deriveIncomeFromRate(nextOutcome, partnerReturnRateBps));
    } else {
      setPartnerReturnRate(fromBps(deriveRateFromIncome(nextOutcome, numericIncome)));
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");

    if (!userCardId) {
      setLocalError("Vui lòng chọn thẻ.");
      return;
    }
    if (!transactionDate) {
      setLocalError("Vui lòng chọn ngày giao dịch.");
      return;
    }
    if (numericOutcome <= 0) {
      setLocalError("Số tiền giao dịch phải lớn hơn 0.");
      return;
    }
    if (numericIncome < 0 || numericIncome > numericOutcome) {
      setLocalError("Số tiền đối tác hoàn lại phải từ 0 đến số tiền giao dịch.");
      return;
    }
    if (matchingStatement?.paymentStatus === "PAID") {
      setLocalError("Kỳ sao kê đã thanh toán. Hãy mở lại kỳ sao kê trước khi chỉnh sửa giao dịch.");
      return;
    }

    const warning =
      matchingStatement?.paymentStatus === "STATEMENT_CLOSED"
        ? "Kỳ sao kê đã đóng. Thay đổi này sẽ tính lại tổng sao kê, hạn thanh toán và lợi nhuận. Bạn muốn tiếp tục?"
        : "";

    onSubmit(
      {
        userCardId,
        transactionDate,
        outcomeAmount: numericOutcome,
        incomeAmount: numericIncome,
        partnerReturnRateBps,
        incomeInputMode,
        cashbackRateBps,
        eligibleForAnnualFeeWaiver,
        note,
      },
      warning,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="transaction-form-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b cc-border px-5 py-4">
          <div>
            <h3 id="transaction-form-title" className="text-lg font-bold text-gray-900">
              {transaction ? "Sửa giao dịch" : "Thêm giao dịch"}
            </h3>
            <p className="text-sm font-medium cc-text-muted">{formatDateDisplay(transactionDate)}</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng form giao dịch" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            x
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="transaction-date" className="mb-1 block text-sm font-semibold cc-text-primary">
                Ngày giao dịch
              </label>
              <input id="transaction-date" type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} className="cc-control w-full rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="transaction-card" className="mb-1 block text-sm font-semibold cc-text-primary">
                Thẻ sử dụng
              </label>
              <select id="transaction-card" value={userCardId} onChange={(event) => setUserCardId(event.target.value)} className="cc-control w-full rounded-lg px-3 py-2.5 text-sm">
                {cards.map((card) => (
                  <option key={card._id} value={card._id}>
                    {getProviderName(card)} · {getDisplayName(card)} · {card.owner || "Tôi"}
                  </option>
                ))}
              </select>
            </div>
            <MoneyField id="outcome-amount" label="Tiền Out · Chi tiêu bằng thẻ" value={outcomeAmount} onChange={handleOutcomeChange} />
            <MoneyField id="income-amount" label="Tiền In · Đối tác hoàn" value={incomeAmount} onChange={syncRateFromIncome} />
            <PercentField id="partner-rate" label="Tỷ lệ đối tác hoàn" value={partnerReturnRate} onChange={syncIncomeFromRate} />
            <PercentField id="cashback-rate" label="Tỷ lệ cashback" value={cashbackRate} onChange={setCashbackRate} />
          </div>

          <p className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-xs leading-5 text-cyan-900">
            Giao dịch này chỉ ghi nhận dòng tiền của một lần quẹt thẻ: <strong>Tiền Out</strong> là khoản chi cho đối tác và <strong>Tiền In</strong> là khoản đối tác hoàn về tài khoản của bạn. Phí thường niên và tiền bạn trả sao kê là dòng tiền riêng, được ghi nhận ở phần phí thẻ và thanh toán để không làm sai tổng chi tiêu.
          </p>

          <label className="flex items-center gap-2 text-sm font-semibold cc-text-muted">
            <input type="checkbox" checked={eligibleForAnnualFeeWaiver} onChange={(event) => setEligibleForAnnualFeeWaiver(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Tính vào doanh số miễn phí thường niên
          </label>

          <div>
            <label htmlFor="transaction-note" className="mb-1 block text-sm font-semibold cc-text-primary">
              Ghi chú
            </label>
            <textarea id="transaction-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} className="cc-control w-full rounded-lg p-3 text-sm" />
          </div>

          <div className="cc-panel grid grid-cols-1 gap-3 rounded-lg p-4 text-sm sm:grid-cols-2">
            <Preview label="Tiền Out" value={formatVnd(numericOutcome)} />
            <Preview label="Tiền In" value={formatVnd(numericIncome)} />
            <Preview label="Chi phí ròng" value={formatVnd(serviceFee)} />
            <Preview label="Cashback theo tỷ lệ" value={formatVnd(expectedCashback)} />
            <Preview label={capLabel} value={cashbackRemaining === null ? "Không giới hạn" : formatVnd(cashbackRemaining)} />
            <Preview label="Cashback được hưởng" value={formatVnd(eligibleCashback)} />
            <Preview label="Cashback vượt giới hạn" value={formatVnd(exceededCashback)} />
            <Preview label="Lợi nhuận dự kiến" value={formatVnd(expectedNetProfit)} />
            <Preview label="Tỷ lệ hoàn" value={formatRateBps(partnerReturnRateBps)} />
            <Preview label="Kỳ sao kê" value={matchingStatement ? formatDateDisplay(matchingStatement.statementDate) : "Sẽ tạo kỳ mới"} />
            <Preview label="Hạn thanh toán" value={matchingStatement ? formatDateDisplay(matchingStatement.paymentDueDate) : "Tính sau khi lưu"} />
          </div>

          {(localError || error) && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{localError || error}</p>}

          <div className="flex justify-end gap-3 border-t cc-border pt-4">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg px-5 py-2.5 font-semibold cc-text-primary hover:bg-surface-elevated">
              Hủy
            </button>
            <button type="submit" disabled={submitting || cards.length === 0} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60">
              {submitting ? "Đang lưu..." : "Lưu giao dịch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MoneyField({ id, label, value, onChange }: { id: string; label: string; value: number | ""; onChange: (value: number | "") => void }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold cc-text-primary">
        {label}
      </label>
      <input id={id} type="number" min="0" value={formatNumberInput(value)} onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))} className="cc-control w-full rounded-lg px-3 py-2.5 text-right text-sm" />
    </div>
  );
}

function PercentField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold cc-text-primary">
        {label}
      </label>
      <input id={id} type="number" min="0" max="100" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="cc-control w-full rounded-lg px-3 py-2.5 text-right text-sm" />
    </div>
  );
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold cc-text-muted">{label}</p>
      <p className="font-bold cc-text-primary">{value}</p>
    </div>
  );
}
