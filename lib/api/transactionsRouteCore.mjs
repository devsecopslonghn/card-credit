import { NextResponse } from "next/server.js";
import { handleApiError, parseJsonRequest } from "./errorsCore.mjs";
import {
  createTransaction,
  deleteTransaction,
  getStatementDetail,
  listStatementsForCard,
  listTransactions,
  closeStatement,
  markStatementPaid,
  reopenStatement,
  updateTransaction,
  updateTransactionCashback,
} from "../services/transactionService.mjs";

const sessionFrom = (requireAuth, request) => (requireAuth ? requireAuth(request) : null);

export const createTransactionRouteHandlers = ({ connectToDatabase, TransactionModel, CardModel, CardStatementModel, requireAuth }) => ({
  async GET(request) {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const { searchParams } = new URL(request.url);
      const data = await listTransactions({
        searchParams,
        deps: { TransactionModel, CardModel, CardStatementModel },
        session,
      });
      return NextResponse.json({ data });
    } catch (error) {
      return handleApiError("GET /api/card-transactions failed", error);
    }
  },

  async POST(request) {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const body = await parseJsonRequest(request);
      const result = await createTransaction(body, { TransactionModel, CardModel, CardStatementModel }, session);
      return NextResponse.json({ data: result.transaction, requiresClosedStatementConfirmation: result.requiresClosedStatementConfirmation }, { status: 201 });
    } catch (error) {
      return handleApiError("POST /api/card-transactions failed", error);
    }
  },
});

export const createTransactionDetailRouteHandlers = ({ connectToDatabase, TransactionModel, CardModel, CardStatementModel, requireAuth }) => ({
  async PATCH(request, context) {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const { id } = await context.params;
      const body = await parseJsonRequest(request);
      const result = await updateTransaction(id, body, { TransactionModel, CardModel, CardStatementModel }, session);
      return NextResponse.json({ data: result.transaction, requiresClosedStatementConfirmation: result.requiresClosedStatementConfirmation });
    } catch (error) {
      return handleApiError("PATCH /api/card-transactions/:id failed", error);
    }
  },

  async DELETE(request, context) {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const { id } = await context.params;
      const result = await deleteTransaction(id, { TransactionModel, CardStatementModel }, session);
      return NextResponse.json({ data: result });
    } catch (error) {
      return handleApiError("DELETE /api/card-transactions/:id failed", error);
    }
  },
});

export const createTransactionCashbackRouteHandler =
  ({ connectToDatabase, TransactionModel, CardModel, CardStatementModel, requireAuth }) =>
  async (request, context) => {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const { id } = await context.params;
      const body = await parseJsonRequest(request);
      const result = await updateTransactionCashback(id, body, { TransactionModel, CardModel, CardStatementModel }, session);
      return NextResponse.json({ data: result.transaction, requiresClosedStatementConfirmation: result.requiresClosedStatementConfirmation });
    } catch (error) {
      return handleApiError("PATCH /api/card-transactions/:id/cashback failed", error);
    }
  };

export const createCardStatementRouteHandlers = ({ connectToDatabase, TransactionModel, CardModel, CardStatementModel, requireAuth }) => ({
  async GET(request, context) {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const { id } = await context.params;
      const data = await listStatementsForCard(id, { TransactionModel, CardModel, CardStatementModel }, session);
      return NextResponse.json({ data });
    } catch (error) {
      return handleApiError("GET /api/cards/:id/statements failed", error);
    }
  },
});

export const createCardStatementDetailRouteHandlers = ({ connectToDatabase, TransactionModel, CardModel, CardStatementModel, requireAuth }) => ({
  async GET(request, context) {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const { id, statementId } = await context.params;
      const data = await getStatementDetail(id, statementId, { TransactionModel, CardModel, CardStatementModel }, session);
      return NextResponse.json({ data });
    } catch (error) {
      return handleApiError("GET /api/cards/:id/statements/:statementId failed", error);
    }
  },
});

export const createStatementPaymentRouteHandler =
  ({ connectToDatabase, TransactionModel, CardModel, CardStatementModel, requireAuth }) =>
  async (request, context) => {
    try {
      const session = sessionFrom(requireAuth, request);
      await connectToDatabase();
      const { id, statementId } = await context.params;
      const body = await parseJsonRequest(request);
      const action = body.action === "REOPEN" ? "REOPEN" : body.action === "CLOSED" ? "CLOSED" : "PAID";
      const data =
        action === "REOPEN"
          ? await reopenStatement(id, statementId, { TransactionModel, CardModel, CardStatementModel }, session)
          : action === "CLOSED"
            ? await closeStatement(id, statementId, { TransactionModel, CardModel, CardStatementModel }, session)
          : await markStatementPaid(id, statementId, { TransactionModel, CardModel, CardStatementModel }, session);
      return NextResponse.json({ data });
    } catch (error) {
      return handleApiError("PATCH /api/cards/:id/statements/:statementId/payment failed", error);
    }
  };
