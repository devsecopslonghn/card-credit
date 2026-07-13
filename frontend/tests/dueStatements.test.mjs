import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildDueStatementGroups, buildOverdueStatementRows, buildStatementRows } from "../lib/cards/dueStatementsCore.mjs";

const cards = [
  { _id: "card-a", providerName: "VIB", displayName: "Max Card", owner: "Tôi" },
  { _id: "card-b", providerName: "Sacombank", displayName: "Visa Platinum Cashback", owner: "Long" },
  { _id: "card-c", providerName: "ACB", displayName: "One", owner: "Mẹ" },
];

const statement = (overrides) => ({
  _id: overrides._id,
  userCardId: overrides.userCardId,
  statementDate: overrides.statementDate,
  paymentDueDate: overrides.paymentDueDate,
  paymentStatus: overrides.paymentStatus ?? "STATEMENT_CLOSED",
  effectivePaymentStatus: overrides.effectivePaymentStatus ?? overrides.paymentStatus ?? "STATEMENT_CLOSED",
  summary: { totalAmountDue: overrides.amount },
});

test("due statements group by due month and calculate count and amount", () => {
  const groups = buildDueStatementGroups({
    cards,
    today: "2026-07-10",
    statements: [
      statement({ _id: "jul", userCardId: "card-a", statementDate: "2026-06-30", paymentDueDate: "2026-07-15", amount: 1_000_000 }),
      statement({ _id: "aug-1", userCardId: "card-b", statementDate: "2026-07-01", paymentDueDate: "2026-08-16", amount: 2_000_000 }),
      statement({ _id: "aug-2", userCardId: "card-c", statementDate: "2026-07-02", paymentDueDate: "2026-08-16", amount: 3_000_000 }),
    ],
  });

  assert.equal(groups.length, 2);
  assert.equal(groups[0].monthLabel, "Tháng 07/2026");
  assert.equal(groups[0].dueCount, 1);
  assert.equal(groups[0].dueAmount, 1_000_000);
  assert.equal(groups[1].monthLabel, "Tháng 08/2026");
  assert.equal(groups[1].dueCount, 2);
  assert.equal(groups[1].dueAmount, 5_000_000);
});

test("due statements sort by due date then bank then card name inside month", () => {
  const groups = buildDueStatementGroups({
    cards,
    today: "2026-07-10",
    statements: [
      statement({ _id: "late", userCardId: "card-b", statementDate: "2026-07-01", paymentDueDate: "2026-08-20", amount: 1 }),
      statement({ _id: "acb", userCardId: "card-c", statementDate: "2026-07-01", paymentDueDate: "2026-08-16", amount: 1 }),
      statement({ _id: "vib", userCardId: "card-a", statementDate: "2026-07-01", paymentDueDate: "2026-08-16", amount: 1 }),
    ],
  });

  assert.deepEqual(groups[0].rows.map((row) => row.statement._id), ["acb", "vib", "late"]);
});

test("due statements exclude zero amount future paid and overdue rows", () => {
  const groups = buildDueStatementGroups({
    cards,
    today: "2026-07-10",
    statements: [
      statement({ _id: "zero", userCardId: "card-a", statementDate: "2026-06-30", paymentDueDate: "2026-07-15", amount: 0 }),
      statement({ _id: "future", userCardId: "card-a", statementDate: "2026-08-30", paymentDueDate: "2026-09-15", amount: 1 }),
      statement({ _id: "paid", userCardId: "card-a", statementDate: "2026-06-30", paymentDueDate: "2026-07-15", amount: 1, paymentStatus: "PAID" }),
      statement({ _id: "overdue", userCardId: "card-a", statementDate: "2026-06-01", paymentDueDate: "2026-07-01", amount: 1, effectivePaymentStatus: "OVERDUE" }),
      statement({ _id: "valid", userCardId: "card-a", statementDate: "2026-06-30", paymentDueDate: "2026-07-15", amount: 1 }),
    ],
  });
  const overdue = buildOverdueStatementRows({
    cards,
    today: "2026-07-10",
    statements: [statement({ _id: "overdue", userCardId: "card-a", statementDate: "2026-06-01", paymentDueDate: "2026-07-01", amount: 1 })],
  });

  assert.deepEqual(groups.flatMap((group) => group.rows.map((row) => row.statement._id)), ["valid"]);
  assert.deepEqual(overdue.map((row) => row.statement._id), ["overdue"]);
});

test("shared statement row builder resolves cards amounts and status once", () => {
  const rows = buildStatementRows({
    cards,
    today: "2026-07-10",
    statements: [
      statement({ _id: "known", userCardId: "card-a", statementDate: "2026-06-01", paymentDueDate: "2026-07-01", amount: "125000" }),
      statement({ _id: "orphan", userCardId: "missing", statementDate: "2026-06-01", paymentDueDate: "2026-07-20", amount: 500 }),
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].card._id, "card-a");
  assert.equal(rows[0].amountDue, 125000);
  assert.equal(rows[0].status, "OVERDUE");
});

test("dashboard upcoming component uses semantic tokens and no legacy monthly data", () => {
  const source = readFileSync(new URL("../components/cards/UpcomingPayments.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("monthlyData"), false);
  assert.equal(source.includes("amountDueThisMonth"), false);
  assert.match(source, /cc-section/);
  assert.match(source, /cc-badge/);
  assert.match(source, /md:hidden/);
  assert.match(source, /hidden .*md:block|hidden overflow-hidden/);
  assert.match(source, />Thao tác</);
  assert.match(source, /Chốt sao kê/);
  assert.match(source, /Đánh dấu đã thanh toán/);
  assert.match(source, /paymentActionKey\(statement\._id, "CLOSED"\)/);
  assert.match(source, /paymentActionKey\(statement\._id, "PAID"\)/);
  assert.match(source, /disabled=\{rowPending \|\| closed \|\| paid\}/);
  assert.match(source, /disabled=\{rowPending \|\| paid \|\| !hasAmountDue\}/);
  assert.equal(/text-gray-[34]00|text-gray-500|opacity-50|bg-white\/|border-white\//.test(source), false);
});

test("cards page sends persisted card and statement ids and replaces successful statement state", () => {
  const source = readFileSync(new URL("../app/cards/page.tsx", import.meta.url), "utf8");
  assert.match(source, /loadStatements: fetchAllCardStatements/);
  assert.match(source, /loadDashboardResources/);
  assert.match(source, /setStatements\(result\.statements\)/);
  assert.match(source, /setStatementsError\(result\.statementsError\)/);
  assert.equal(source.includes("loadedCards.map((card) => fetchCardStatements"), false);
  assert.match(source, /updateStatementPayment\(statement\.userCardId, statement\._id, action\)/);
  assert.match(source, /item\._id === updated\._id \? updated : item/);
  assert.match(source, /pendingPaymentActionsRef\.current\.has\(key\)/);
  assert.match(source, /showToast\(error instanceof Error \? error\.message/);
});
