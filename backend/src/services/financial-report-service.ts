import { FinancialTransactionModel } from "../models/financial-transaction.js";
import { AccountModel } from "../models/account.js";
import { CardStatementModel } from "../models/card-statement.js";
import type { ServiceContext } from "./types/service-context.js";

type Range = { from: string; to: string };

const empty = () => ({ personalSpending: 0, debitCashflow: 0, creditDebt: 0, outstandingReceivable: 0, reimbursementReceived: 0, transactionCount: 0 });

const add = (target: ReturnType<typeof empty>, item: Record<string, unknown>) => {
  target.personalSpending += Number(item.personalSpending ?? 0);
  target.debitCashflow += Number(item.debitCashflow ?? 0);
  target.creditDebt += Number(item.creditDebt ?? 0);
  target.outstandingReceivable += Number(item.outstandingReceivable ?? 0);
  target.reimbursementReceived += Number(item.reimbursementReceived ?? 0);
  target.transactionCount += 1;
};

export class FinancialReportService {
  static async statementSummary(ctx: ServiceContext, statementId: string) {
    const statement = await CardStatementModel.findOne({ _id: statementId, workspaceId: ctx.workspaceId }).lean();
    if (!statement) return null;
    const transactions = await FinancialTransactionModel.find({ workspaceId: ctx.workspaceId, statementId }).lean();
    const totals = empty();
    for (const item of transactions) add(totals, item as Record<string, unknown>);
    const sourceIds = transactions.filter((item) => item.transactionType === "EXPENSE" && item.ownership === "PAID_FOR_OTHER").map((item) => item._id);
    const reimbursements = sourceIds.length ? await FinancialTransactionModel.find({ workspaceId: ctx.workspaceId, transactionType: "REIMBURSEMENT", reimbursementForTransactionId: { $in: sourceIds } }).select({ amount: 1 }).lean() : [];
    totals.outstandingReceivable = Math.max(0, totals.outstandingReceivable - reimbursements.reduce((sum, item) => sum + Number(item.amount ?? 0), 0));
    return {
      id: String(statement._id),
      cardId: String(statement.userCardId),
      statementDate: statement.statementDate,
      periodStartDate: statement.periodStartDate,
      periodEndDate: statement.periodEndDate,
      paymentDueDate: statement.paymentDueDate,
      paymentStatus: statement.paymentStatus,
      outstandingDebt: Math.max(0, totals.creditDebt),
      totals,
      transactions: transactions.map((item) => ({
        id: String(item._id),
        accountId: String(item.accountId),
        amount: item.amount,
        transactionType: item.transactionType,
        ownership: item.ownership,
        transactionDate: item.transactionDate,
        note: item.note ?? "",
        impact: {
          personalSpending: item.personalSpending,
          debitCashflow: item.debitCashflow,
          creditDebt: item.creditDebt,
          outstandingReceivable: item.outstandingReceivable,
        },
      })),
    };
  }

  static async upcomingStatements(ctx: ServiceContext, limit = 20) {
    const statements = await CardStatementModel.find({ workspaceId: ctx.workspaceId, paymentStatus: { $ne: "PAID" } })
      .sort({ paymentDueDate: 1 }).limit(Math.min(Math.max(limit, 1), 50)).lean();
    const result = [];
    for (const statement of statements) {
      const summary = await this.statementSummary(ctx, String(statement._id));
      if (summary) result.push(summary);
    }
    return result;
  }

  static async summary(ctx: ServiceContext, range: Range) {
    const [items, accounts] = await Promise.all([
      FinancialTransactionModel.find({ workspaceId: ctx.workspaceId, transactionDate: { $gte: range.from, $lte: range.to } }).lean(),
      AccountModel.find({ workspaceId: ctx.workspaceId, active: { $ne: false } }).lean(),
    ]);
    const byCategory = new Map<string, ReturnType<typeof empty>>();
    const byAccountType = new Map<string, ReturnType<typeof empty>>();
    const accountNames = new Map(accounts.map((account) => [String(account._id), String(account.name)]));
    const byAccount = new Map<string, ReturnType<typeof empty>>();
    for (const item of items) {
      const value = item as Record<string, unknown>;
      const category = String(value.categoryId ?? "OTHER");
      const categoryTotals = byCategory.get(category) ?? empty();
      add(categoryTotals, value);
      byCategory.set(category, categoryTotals);
      const type = String(value.accountType);
      const typeTotals = byAccountType.get(type) ?? empty();
      add(typeTotals, value);
      byAccountType.set(type, typeTotals);
      const accountId = String(value.accountId);
      const accountTotals = byAccount.get(accountId) ?? empty();
      add(accountTotals, value);
      byAccount.set(accountId, accountTotals);
    }
    const totals = empty();
    for (const item of items) add(totals, item as Record<string, unknown>);
    const sourceIds = items.filter((item) => item.transactionType === "EXPENSE" && item.ownership === "PAID_FOR_OTHER").map((item) => item._id);
    const reimbursements = sourceIds.length ? await FinancialTransactionModel.find({ workspaceId: ctx.workspaceId, transactionType: "REIMBURSEMENT", reimbursementForTransactionId: { $in: sourceIds } }).select({ amount: 1 }).lean() : [];
    totals.outstandingReceivable = Math.max(0, totals.outstandingReceivable - reimbursements.reduce((sum, item) => sum + Number(item.amount ?? 0), 0));
    const netAssets = accounts.filter((account) => String(account.type) !== "CREDIT").reduce((sum, account) => sum + Number(account.openingBalance ?? 0), 0) + totals.debitCashflow;
    const creditDebtBalance = accounts.filter((account) => String(account.type) === "CREDIT").reduce((sum, account) => sum + Number(account.openingBalance ?? 0), 0) + totals.creditDebt;
    return {
      range,
      totals,
      netAssets,
      creditDebtBalance,
      debit: byAccountType.get("DEBIT") ?? empty(),
      cash: byAccountType.get("CASH") ?? empty(),
      eWallet: byAccountType.get("E_WALLET") ?? empty(),
      realMoney: ["DEBIT", "CASH", "E_WALLET"].reduce((total, type) => { const value = byAccountType.get(type); if (value) { total.personalSpending += value.personalSpending; total.debitCashflow += value.debitCashflow; total.creditDebt += value.creditDebt; total.outstandingReceivable += value.outstandingReceivable; total.reimbursementReceived += value.reimbursementReceived; total.transactionCount += value.transactionCount; } return total; }, empty()),
      credit: byAccountType.get("CREDIT") ?? empty(),
      byCategory: Object.fromEntries(byCategory),
      byAccount: Object.fromEntries([...byAccount.entries()].map(([id, value]) => [id, { name: accountNames.get(id) ?? "", ...value }])),
    };
  }

  static async creditStatements(ctx: ServiceContext, range?: Range) {
    const query: Record<string, unknown> = { workspaceId: ctx.workspaceId };
    if (range) query.statementDate = { $gte: range.from, $lte: range.to };
    const [statements, transactions] = await Promise.all([
      CardStatementModel.find(query).sort({ paymentDueDate: 1 }).lean(),
      FinancialTransactionModel.find({ workspaceId: ctx.workspaceId, statementId: { $ne: null } }).lean(),
    ]);
    const grouped = new Map<string, { grossCharges: number; payments: number; personalSpending: number; outstandingReceivable: number; transactionCount: number }>();
    for (const transaction of transactions) {
      const statementId = String(transaction.statementId);
      const current = grouped.get(statementId) ?? { grossCharges: 0, payments: 0, personalSpending: 0, outstandingReceivable: 0, transactionCount: 0 };
      if (transaction.transactionType === "STATEMENT_PAYMENT") current.payments += Number(transaction.amount ?? 0);
      else current.grossCharges += Number(transaction.amount ?? 0);
      current.personalSpending += Number(transaction.personalSpending ?? 0);
      current.outstandingReceivable += Number(transaction.outstandingReceivable ?? 0);
      if (transaction.transactionType === "REIMBURSEMENT") current.outstandingReceivable -= Number(transaction.amount ?? 0);
      current.transactionCount += 1;
      grouped.set(statementId, current);
    }
    return statements.map((statement) => {
      const values = grouped.get(String(statement._id)) ?? { grossCharges: 0, payments: 0, personalSpending: 0, outstandingReceivable: 0, transactionCount: 0 };
      return {
        statementId: String(statement._id),
        statementDate: statement.statementDate,
        periodStartDate: statement.periodStartDate,
        periodEndDate: statement.periodEndDate,
        paymentDueDate: statement.paymentDueDate,
        paymentStatus: statement.paymentStatus,
        outstandingDebt: Math.max(0, values.grossCharges - values.payments),
        ...values,
      };
    });
  }
}
