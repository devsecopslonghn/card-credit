import { createStatementPaymentRouteHandler } from "@/lib/api/transactionsRouteCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import CreditCard from "@/models/CreditCard";
import CardStatement from "@/models/CardStatement";
import CardTransaction from "@/models/CardTransaction";

export const PATCH = createStatementPaymentRouteHandler({
  connectToDatabase,
  TransactionModel: CardTransaction,
  CardModel: CreditCard,
  CardStatementModel: CardStatement,
  requireAuth,
});
