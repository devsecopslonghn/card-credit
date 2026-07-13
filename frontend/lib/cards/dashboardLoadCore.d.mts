export type DashboardLoadResult<Card, Statement> = {
  cards: Card[];
  statements: Statement[];
  cardsError: string;
  statementsError: string;
};

export declare const loadDashboardResources: <Card, Statement>(loaders: {
  loadCards: () => Promise<Card[]>;
  loadStatements: () => Promise<Statement[]>;
}) => Promise<DashboardLoadResult<Card, Statement>>;
