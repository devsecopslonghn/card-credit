export type CashFlowEvent = { cardId: string; amount: number; kind: "STATEMENT_PAYMENT" | "FEE" | "PARTNER_RETURN" | "BANK_CASHBACK" };
export type MonthlyCashFlow = { cardId: string; period: string; totalOut: number; totalIn: number; statementPayments: number; actualFees: number; partnerReturns: number; bankCashbackActual: number; netResult: number };
export const buildMonthlyCashFlow = (cardIds: string[], period: string, events: CashFlowEvent[]): MonthlyCashFlow[] => cardIds.map((cardId) => {
  const own = events.filter((event) => event.cardId === cardId);
  const sum = (kind: CashFlowEvent["kind"]) => own.filter((event) => event.kind === kind).reduce((total, event) => total + event.amount, 0);
  const statementPayments = sum("STATEMENT_PAYMENT"); const actualFees = sum("FEE"); const partnerReturns = sum("PARTNER_RETURN"); const bankCashbackActual = sum("BANK_CASHBACK");
  const totalOut = statementPayments + actualFees; const totalIn = partnerReturns + bankCashbackActual;
  return { cardId, period, totalOut, totalIn, statementPayments, actualFees, partnerReturns, bankCashbackActual, netResult: totalIn - totalOut };
});
