import mongoose from "mongoose";
import { FinancialTransactionModel } from "../models/financial-transaction.js";
import { AccountModel } from "../models/account.js";
import { CardFeePaymentModel } from "../models/card-fee-payment.js";
import { MonthlyCardCashbackModel } from "../models/monthly-card-cashback.js";
import { CardStatementModel } from "../models/card-statement.js";
import { CreditCardModel } from "../models/credit-card.js";
import type { ServiceContext } from "./types/service-context.js";
import { ApiError } from "../errors.js";
import { StatementQueryService } from "./statement-query-service.js";
import { creditStatementReportListSchema, financialReportSchema, reportDateRangeSchema } from "@card-credit/contracts";
import type { CreditStatementReportDto, FinancialReportDto } from "@card-credit/contracts";

type Range = { from: string; to: string };

const empty = () => ({ personalSpending: 0, debitCashflow: 0, creditDebt: 0, outstandingReceivable: 0, reimbursementReceived: 0, transactionCount: 0 });
const emptyTotals = () => ({
  ...empty(),
  totalServiceFee: 0,
  transactionCashbackActual: 0,
  monthlyBankCashbackExpected: 0,
  monthlyBankCashbackActual: 0,
  monthlyBankCashbackRejected: 0,
  totalPaidCardFees: 0,
  actualNetBenefit: 0,
});

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

  static async summary(ctx: ServiceContext, range: Range, filters: { cardId?: string; owner?: string } = {}) {
    range = reportDateRangeSchema.parse(range) as Range;
    let transactionScope: Record<string, unknown> = { workspaceId: ctx.workspaceId, transactionDate: { $gte: range.from, $lte: range.to } };
    const accountScope: Record<string, unknown> = { workspaceId: ctx.workspaceId, active: { $ne: false } };
    const cardScope: Record<string, unknown> = { workspaceId: ctx.workspaceId };
    let cardAccountIds: unknown[] = [];
    let reportCardIds: unknown[] | null = null;
    if (filters.cardId || filters.owner) {
      if (filters.cardId && !mongoose.isValidObjectId(filters.cardId)) throw new ApiError(400, "INVALID_REPORT_FILTER", "Bộ lọc thẻ không hợp lệ.");
      const cards = await CreditCardModel.find({
        ...cardScope,
        ...(filters.cardId ? { _id: filters.cardId } : {}),
        ...(filters.owner ? { owner: filters.owner.trim() } : {}),
      }).select({ _id: 1 }).lean();
      if (filters.cardId && !cards.length) throw new ApiError(404, "CARD_NOT_FOUND", "Không tìm thấy thẻ.");
      reportCardIds = cards.map((card) => card._id);
      const [cardAccounts, cardStatements] = await Promise.all([
        AccountModel.find({ ...accountScope, creditCardId: { $in: reportCardIds } }).select({ _id: 1 }).lean(),
        CardStatementModel.find({ ...cardScope, userCardId: { $in: reportCardIds } }).select({ _id: 1 }).lean(),
      ]);
      cardAccountIds = cardAccounts.map((account) => account._id);
      transactionScope = { ...transactionScope, $or: [
        { accountId: { $in: cardAccountIds } },
        { statementId: { $in: cardStatements.map((statement) => statement._id) } },
      ] };
    }
    const [items, accounts, monthlyCashbacks, feePayments] = await Promise.all([
      FinancialTransactionModel.find(transactionScope).lean(),
      AccountModel.find(accountScope).lean(),
      MonthlyCardCashbackModel.find({ workspaceId: ctx.workspaceId, ...(reportCardIds ? { userCardId: { $in: reportCardIds } } : {}), period: { $gte: range.from.slice(0, 7), $lte: range.to.slice(0, 7) } }).lean(),
      CardFeePaymentModel.find({
        workspaceId: ctx.workspaceId,
        ...(reportCardIds ? { userCardId: { $in: reportCardIds } } : {}),
        paymentDate: { $gte: range.from, $lte: range.to },
        category: { $in: ["ANNUAL_CARD_FEE", "MANAGEMENT_FEE", "OTHER_FEE"] },
      }).lean(),
    ]);
    const reportAccounts = reportCardIds
      ? accounts.filter((account) => cardAccountIds.some((id) => String(id) === String(account._id)) || items.some((item) => String(item.accountId) === String(account._id)))
      : accounts;
    const byCategory = new Map<string, ReturnType<typeof empty>>();
    const byAccountType = new Map<string, ReturnType<typeof empty>>();
    const accountNames = new Map(reportAccounts.map((account) => [String(account._id), String(account.name)]));
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
    const totals = emptyTotals();
    for (const item of items) add(totals, item as Record<string, unknown>);
    totals.totalServiceFee = items.reduce((sum, item) => {
      const value = item as Record<string, unknown>;
      if (value.transactionType !== "EXPENSE" || value.ownership !== "PAID_FOR_OTHER") return sum;
      return sum + Math.max(0, Number(value.amount ?? 0) - Number(value.reimbursementExpected ?? 0) - Number(value.refundReceived ?? 0));
    }, 0);
    totals.transactionCashbackActual = items.reduce((sum, item) => sum + Math.max(0, Number((item as Record<string, unknown>).cashbackReceived ?? 0)), 0);
    totals.monthlyBankCashbackExpected = monthlyCashbacks.reduce((sum, item) => sum + Math.max(0, Number((item as Record<string, unknown>).expectedAmount ?? 0)), 0);
    totals.monthlyBankCashbackActual = monthlyCashbacks.reduce((sum, item) => {
      const value = item as Record<string, unknown>;
      return sum + (value.status === "RECEIVED" ? Math.max(0, Number(value.actualAmount ?? 0)) : 0);
    }, 0);
    totals.monthlyBankCashbackRejected = monthlyCashbacks.reduce((sum, item) => {
      const value = item as Record<string, unknown>;
      return sum + (value.status === "REJECTED" ? Math.max(0, Number(value.expectedAmount ?? 0)) : 0);
    }, 0);
    const paidFeeCategories = new Set(["ANNUAL_CARD_FEE", "MANAGEMENT_FEE", "OTHER_FEE"]);
    totals.totalPaidCardFees = feePayments.reduce((sum, item) => {
      const value = item as Record<string, unknown>;
      return sum + (paidFeeCategories.has(String(value.category)) ? Math.max(0, Number(value.amount ?? 0)) : 0);
    }, 0);
    totals.actualNetBenefit = totals.monthlyBankCashbackActual - totals.totalServiceFee - totals.totalPaidCardFees;
    const sourceIds = items.filter((item) => item.transactionType === "EXPENSE" && item.ownership === "PAID_FOR_OTHER").map((item) => item._id);
    const reimbursements = sourceIds.length ? await FinancialTransactionModel.find({ workspaceId: ctx.workspaceId, transactionType: "REIMBURSEMENT", reimbursementForTransactionId: { $in: sourceIds } }).select({ amount: 1 }).lean() : [];
    totals.outstandingReceivable = Math.max(0, totals.outstandingReceivable - reimbursements.reduce((sum, item) => sum + Number(item.amount ?? 0), 0));
    const netAssets = reportAccounts.filter((account) => String(account.type) !== "CREDIT").reduce((sum, account) => sum + Number(account.openingBalance ?? 0), 0) + totals.debitCashflow;
    const creditDebtBalance = reportAccounts.filter((account) => String(account.type) === "CREDIT").reduce((sum, account) => sum + Number(account.openingBalance ?? 0), 0) + totals.creditDebt;
    return financialReportSchema.parse({
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
    }) as FinancialReportDto;
  }

  static async creditStatements(ctx: ServiceContext, range?: Range) {
    const statements = await StatementQueryService.list(ctx, {
      statementDateFrom: range?.from,
      statementDateTo: range?.to,
      order: "paymentDueDate",
      includeTransactions: false,
    });
    return creditStatementReportListSchema.parse(statements.map((statement) => ({
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
    }))) as CreditStatementReportDto[];
  }
}
