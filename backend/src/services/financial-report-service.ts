import { FinancialTransactionModel } from "../models/financial-transaction.js";
import { AccountModel } from "../models/account.js";
import type { ServiceContext } from "./types/service-context.js";
import { StatementQueryService } from "./statement-query-service.js";

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
    return StatementQueryService.getById(ctx, statementId);
  }

  static async upcomingStatements(ctx: ServiceContext, limit = 20) {
    return StatementQueryService.upcoming(ctx, limit);
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
    const statements = await StatementQueryService.list(ctx, {
      statementDateFrom: range?.from,
      statementDateTo: range?.to,
      order: "paymentDueDate",
      includeTransactions: false,
    });
    return statements.map((statement) => ({
      statementId: statement.id,
      statementDate: statement.statementDate,
      periodStartDate: statement.periodStartDate,
      periodEndDate: statement.periodEndDate,
      paymentDueDate: statement.paymentDueDate,
      paymentStatus: statement.paymentStatus,
      outstandingDebt: statement.summary.outstandingAmount,
      grossCharges: statement.summary.statementAmount,
      payments: statement.summary.paymentAmount,
      personalSpending: statement.summary.personalSpending,
      outstandingReceivable: statement.summary.outstandingReceivable,
      transactionCount: statement.summary.transactionCount,
    }));
  }
}
