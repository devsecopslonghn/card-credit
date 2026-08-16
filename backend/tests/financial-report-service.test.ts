import assert from "node:assert/strict";
import test from "node:test";
import { FinancialReportService } from "../src/services/financial-report-service.js";
import { StatementQueryService } from "../src/services/statement-query-service.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

const context: ServiceContext = { workspaceId: "workspace-a", userId: "user-a", role: "user", channel: "browser", correlationId: "report-test" };
const statement = {
  id: "507f1f77bcf86cd799439021", cardId: "507f1f77bcf86cd799439011", periodStartDate: "2026-07-01", periodEndDate: "2026-07-31",
  statementDate: "2026-07-31", paymentDueDate: "2026-08-15", statementDaySnapshot: 31, paymentDueDaysSnapshot: 15,
  paymentStatus: "OPEN", effectivePaymentStatus: "OPEN", paidAt: null, paidAmount: null,
  summary: { statementAmount: 600_000, paymentAmount: 100_000, outstandingAmount: 500_000, personalSpending: 600_000, outstandingReceivable: 25_000, reimbursementReceived: 75_000, transactionCount: 2 },
  transactions: [],
};

test("credit statement report delegates date range and canonicalizes persisted impact", async (t) => {
  const query = t.mock.method(StatementQueryService, "list", async (_ctx: ServiceContext, options: { statementDateFrom?: string; statementDateTo?: string; order?: "statementDate" | "paymentDueDate"; includeTransactions?: boolean }) => {
    assert.deepEqual(options, { statementDateFrom: "2026-07-01", statementDateTo: "2026-07-31", order: "paymentDueDate", includeTransactions: false });
    return [statement] as never;
  });
  const result = await FinancialReportService.creditStatements(context, { from: "2026-07-01", to: "2026-07-31" });
  assert.deepEqual(result, [{
    statementId: statement.id,
    statementDate: statement.statementDate,
    periodStartDate: statement.periodStartDate,
    periodEndDate: statement.periodEndDate,
    paymentDueDate: statement.paymentDueDate,
    paymentStatus: statement.paymentStatus,
    outstandingDebt: 500_000,
    grossCharges: 600_000,
    payments: 100_000,
    personalSpending: 600_000,
    outstandingReceivable: 25_000,
    transactionCount: 2,
  }]);
  assert.equal(query.mock.callCount(), 1);
});

test("credit statement report reads all canonical statements when no range is supplied", async (t) => {
  const query = t.mock.method(StatementQueryService, "list", async (_ctx: ServiceContext, options: { statementDateFrom?: string; statementDateTo?: string; order?: "statementDate" | "paymentDueDate"; includeTransactions?: boolean }) => {
    assert.deepEqual(options, { statementDateFrom: undefined, statementDateTo: undefined, order: "paymentDueDate", includeTransactions: false });
    return [];
  });
  assert.deepEqual(await FinancialReportService.creditStatements(context), []);
  assert.equal(query.mock.callCount(), 1);
});
