"use client";
import { useEffect, useState } from "react";
import { FinanceShell, vnd } from "@/components/finance/FinanceShell";
import { listFinanceAccounts, type FinanceAccount } from "@/lib/api/financeClient";
import { deactivateRecurringExpense, listRecurringExpenses, saveRecurringExpense } from "@/lib/api/recurringExpensesClient";
import type { RecurringExpenseDto } from "@card-credit/contracts";
import type { FormEvent } from "react";

const initialDueDate = () => new Date().toISOString().slice(0, 10);

export default function RecurringPage() {
  const [items, setItems] = useState<RecurringExpenseDto[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [editing, setEditing] = useState<RecurringExpenseDto | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [nextDueDate, setNextDueDate] = useState(initialDueDate);
  const [error, setError] = useState("");
  const load = () => Promise.all([listRecurringExpenses(), listFinanceAccounts()]).then(([recurring, financeAccounts]) => { setItems(recurring); setAccounts(financeAccounts.filter((account) => account.active && account.group === "REAL_MONEY")); setError(""); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Không thể tải khoản định kỳ."));
  useEffect(() => { void load(); }, []);
  const reset = () => { setEditing(null); setName(""); setCategoryId(""); setAccountId(""); setExpectedAmount(""); setNextDueDate(initialDueDate()); };
  const edit = (item: RecurringExpenseDto) => { setEditing(item); setName(item.name); setCategoryId(item.categoryId); setAccountId(item.accountId); setExpectedAmount(String(item.expectedAmount)); setNextDueDate(item.nextDueDate); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { await saveRecurringExpense({ name, categoryId, accountId, expectedAmount: Number(expectedAmount), frequency: "MONTHLY", nextDueDate }, editing?.id); reset(); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu khoản định kỳ."); }
  };
  const deactivate = async (id: string) => { try { await deactivateRecurringExpense(id); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tắt khoản định kỳ."); } };
  return <FinanceShell title="Khoản chi định kỳ"><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"><section className="cc-section p-5"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">{editing ? "Sửa khoản định kỳ" : "Thêm khoản định kỳ"}</h2>{editing ? <button type="button" onClick={reset} className="text-sm font-semibold cc-text-muted">Hủy</button> : null}</div><form onSubmit={save} className="space-y-4"><label className="block text-sm font-semibold">Tên<input required value={name} onChange={(event) => setName(event.target.value)} className="cc-control mt-2 w-full rounded-lg px-3 py-2" /></label><label className="block text-sm font-semibold">Category ID<input required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="cc-control mt-2 w-full rounded-lg px-3 py-2" /></label><label className="block text-sm font-semibold">Tài khoản<select required value={accountId} onChange={(event) => setAccountId(event.target.value)} className="cc-control mt-2 w-full rounded-lg px-3 py-2"><option value="">Chọn tài khoản tiền thực tế</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="block text-sm font-semibold">Số tiền dự kiến<input required min="1" step="1" type="number" value={expectedAmount} onChange={(event) => setExpectedAmount(event.target.value)} className="cc-control mt-2 w-full rounded-lg px-3 py-2" /></label><label className="block text-sm font-semibold">Ngày đến hạn tiếp theo<input required type="date" value={nextDueDate} onChange={(event) => setNextDueDate(event.target.value)} className="cc-control mt-2 w-full rounded-lg px-3 py-2" /></label><button type="submit" className="w-full rounded-lg bg-[#087f83] px-4 py-2.5 font-semibold text-white">{editing ? "Cập nhật" : "Lưu khoản định kỳ"}</button></form></section><section className="cc-section p-5"><h2 className="mb-5 text-xl font-bold">Danh sách đang hoạt động</h2>{error ? <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</p> : items.length ? <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-sm cc-text-muted">{item.categoryId} · đến hạn {item.nextDueDate}</p></div><strong>{vnd(item.expectedAmount)}</strong></div><div className="mt-4 flex gap-2"><button type="button" onClick={() => edit(item)} className="cc-control rounded-lg px-3 py-1.5 text-sm font-semibold">Sửa</button><button type="button" onClick={() => void deactivate(item.id)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold">Tắt</button></div></article>)}</div> : <p className="py-10 text-center cc-text-muted">Chưa có khoản chi định kỳ.</p>}</section></div></FinanceShell>;
}
