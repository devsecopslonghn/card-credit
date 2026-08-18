"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DebtLedger } from "@/components/cards/DebtLedger";
import type { CreditCardView } from "@/components/cards/cardTypes";
import { FinanceShell, vnd, typeClass, typeLabel } from "@/components/finance/FinanceShell";
import { fetchAllCardStatements, type CardStatementView } from "@/lib/api/statementsClient";
import { fetchCards } from "@/lib/api/cardsClient";
import { listFinanceAccounts, type FinanceAccount } from "@/lib/api/financeClient";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [cards, setCards] = useState<CreditCardView[]>([]);
  const [statements, setStatements] = useState<CardStatementView[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([listFinanceAccounts(), fetchCards(), fetchAllCardStatements()])
      .then(([accountItems, cardItems, statementItems]) => {
        setAccounts(accountItems);
        setCards(cardItems);
        setStatements(statementItems);
      })
      .catch(() => setError("Không thể tải dữ liệu tài khoản và sổ nợ."));
  }, []);

  const real = useMemo(() => accounts.filter((account) => account.group === "REAL_MONEY"), [accounts]);
  const debt = useMemo(() => accounts.filter((account) => account.group === "DEBT"), [accounts]);

  const group = (items: FinanceAccount[], title: string, tone: string) => (
    <section className="cc-section p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-xl font-bold ${tone}`}>{title}</h2>
        <span className="text-sm cc-text-muted">{items.length} tài khoản</span>
      </div>
      {items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((account) => (
            <article key={account.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{account.name}</h3>
                  <p className="mt-1 text-sm cc-text-muted">{typeLabel[account.type]}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${typeClass[account.type]}`}>{account.type}</span>
              </div>
              <p className="mt-5 text-xl font-bold">{vnd(account.group === "DEBT" ? account.currentDebt : account.currentBalance)}</p>
              <p className="mt-1 text-xs cc-text-muted">{account.group === "DEBT" ? "Còn phải trả" : "Số dư hiện tại"} · {account.currency}</p>
              <p className="mt-2 text-xs cc-text-subtle">Số dư ban đầu: {vnd(account.openingBalance)}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center cc-text-muted">Chưa có tài khoản.</p>
      )}
    </section>
  );

  return (
    <FinanceShell title="Tài khoản" action={<Link href="/transactions?add=1" className="rounded-lg bg-[#087f83] px-4 py-2.5 font-semibold text-white">+ Thêm giao dịch</Link>}>
      {error ? <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</p> : null}
      <div className="space-y-6">
        {group(real, "Tiền thực tế", "text-cyan-700")}
        {group(debt, "Tài khoản tín dụng", "text-violet-700")}
        <DebtLedger statements={statements} cards={cards} />
      </div>
    </FinanceShell>
  );
}
