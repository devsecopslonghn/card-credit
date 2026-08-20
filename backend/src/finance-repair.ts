export type RepairAccount = { _id: unknown; workspaceId?: unknown; type?: unknown; active?: unknown; openingBalance?: unknown };
export type RepairTransaction = { _id: unknown; workspaceId?: unknown; accountId?: unknown; accountType?: unknown; transactionType?: unknown; ownership?: unknown; amount?: unknown; statementId?: unknown; reimbursementForTransactionId?: unknown; personalSpending?: unknown; debitCashflow?: unknown; creditDebt?: unknown; outstandingReceivable?: unknown; transactionDate?: unknown; note?: unknown };
export type RepairStatement = { _id: unknown; paymentStatus?: unknown; paidAmount?: unknown; summary?: { outstandingAmount?: unknown; paymentAmount?: unknown } };
const id = (value: unknown) => String(value ?? "");
const n = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const inspectFinanceRepair = (accounts: RepairAccount[], transactions: RepairTransaction[], statements: RepairStatement[]) => {
  const accountById = new Map(accounts.map((account) => [id(account._id), account]));
  const staleAccountType = transactions.filter((tx) => {
    const accountType = accountById.get(id(tx.accountId))?.type;
    return accountType && String(tx.accountType) !== String(accountType);
  }).map((tx) => ({ transactionId: id(tx._id), accountId: id(tx.accountId), stored: String(tx.accountType), expected: String(accountById.get(id(tx.accountId))?.type) }));
  const duplicateGroups = new Map<string, string[]>();
  for (const tx of transactions) {
    const fingerprint = JSON.stringify({ workspaceId: id(tx.workspaceId), accountId: id(tx.accountId), transactionType: tx.transactionType, amount: n(tx.amount), statementId: id(tx.statementId), reimbursementForTransactionId: id(tx.reimbursementForTransactionId), debitCashflow: n(tx.debitCashflow), creditDebt: n(tx.creditDebt), transactionDate: (tx as Record<string, unknown>).transactionDate });
    const group = duplicateGroups.get(fingerprint) ?? []; group.push(id(tx._id)); duplicateGroups.set(fingerprint, group);
  }
  const duplicates = [...duplicateGroups.values()].filter((group) => group.length > 1);
  const technicalIncome = transactions.filter((tx) => tx.transactionType === "INCOME" && /adjust|opening|số dư|so du/i.test(String((tx as Record<string, unknown>).note ?? ""))).map((tx) => id(tx._id));
  const archivedBalances = accounts.filter((account) => account.active === false).map((account) => ({ accountId: id(account._id), openingBalance: n(account.openingBalance), ledgerBalance: transactions.filter((tx) => id(tx.accountId) === id(account._id)).reduce((sum, tx) => sum + n(tx.debitCashflow), 0) })).filter((item) => item.openingBalance !== 0 || item.ledgerBalance !== 0);
  const reimbursementOnPaidStatement = statements.filter((statement) => statement.paymentStatus === "PAID").map((statement) => {
    const statementTransactions = transactions.filter((tx) => id(tx.statementId) === id(statement._id));
    const sourceIds = new Set(statementTransactions.filter((tx) => tx.transactionType === "EXPENSE" && tx.ownership === "PAID_FOR_OTHER").map((tx) => id(tx._id)));
    const received = transactions.filter((tx) => tx.transactionType === "REIMBURSEMENT" && sourceIds.has(id(tx.reimbursementForTransactionId))).reduce((sum, tx) => sum + n(tx.amount), 0);
    return { statementId: id(statement._id), reimbursementReceived: received };
  }).filter((item) => item.reimbursementReceived > 0);
  const paidStatementConflicts = statements.filter((statement) => statement.paymentStatus === "PAID").map((statement) => {
    const ledger = transactions.filter((tx) => id(tx.statementId) === id(statement._id));
    const gross = ledger.reduce((sum, tx) => sum + Math.max(0, n(tx.creditDebt)), 0);
    const paid = ledger.reduce((sum, tx) => sum + (tx.transactionType === "STATEMENT_PAYMENT" ? Math.max(0, n(tx.amount)) : Math.max(0, -n(tx.creditDebt))), 0);
    return { statementId: id(statement._id), outstandingAmount: Math.max(n(statement.summary?.outstandingAmount), gross - paid), paidAmount: n(statement.paidAmount), ledgerPaymentAmount: paid };
  }).filter((item) => item.outstandingAmount > 0 || (item.paidAmount > 0 && item.ledgerPaymentAmount === 0));
  return { counts: { accounts: accounts.length, transactions: transactions.length, statements: statements.length }, staleAccountType, duplicates, technicalIncome, archivedBalances, paidStatementConflicts, reimbursementOnPaidStatement, writeRequired: staleAccountType.length + duplicates.length + technicalIncome.length + archivedBalances.length + paidStatementConflicts.length + reimbursementOnPaidStatement.length > 0 };
};
