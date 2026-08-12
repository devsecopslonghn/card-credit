export type TransactionListFilters = {
  date?: string;
  cardId?: string;
  statementId?: string;
};

export type TransactionServiceResult = Record<string, unknown>;
