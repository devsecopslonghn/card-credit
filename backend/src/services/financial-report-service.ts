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
    return {
      range,
      totals,
      debit: byAccountType.get("DEBIT") ?? empty(),
      cash: byAccountType.get("CASH") ?? empty(),
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
      FinancialTransactionModel.find({ workspaceId: ctx.workspaceId, accountType: "CREDIT", statementId: { $ne: null } }).lean(),
    ]);
    const grouped = new Map<string, { grossCharges: number; payments: number; personalSpending: number; outstandingReceivable: number; transactionCount: number }>();
    for (const transaction of transactions) {
      const statementId = String(transaction.statementId);
      const current = grouped.get(statementId) ?? { grossCharges: 0, payments: 0, personalSpending: 0, outstandingReceivable: 0, transactionCount: 0 };
      if (transaction.transactionType === "STATEMENT_PAYMENT") current.payments += Number(transaction.amount ?? 0);
      else current.grossCharges += Number(transaction.amount ?? 0);
      current.personalSpending += Number(transaction.personalSpending ?? 0);
      current.outstandingReceivable += Number(transaction.outstandingReceivable ?? 0) - Number(transaction.reimbursementReceived ?? 0);
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
