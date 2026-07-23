export type ReportFilters = {
  owner?: string;
  cardId?: string;
  year?: string;
  month?: string;
};

export type ReportTotals = {
  totalOutcome: number;
  totalIncome: number;
  totalServiceFee: number;
  expectedCashback: number;
  actualCashback: number;
  cashbackByRate: number;
  eligibleCashback: number;
  exceededCashback: number;
  expectedNetProfit: number;
  actualNetProfit: number;
  annualEligibleSpend: number;
  totalAmountDue: number;
  transactionCount: number;
  monthlyBankCashbackExpected: number;
  monthlyBankCashbackActual: number;
  monthlyBankCashbackRejected: number;
  totalPaidCardFees: number;
  actualNetBenefit: number;
};

export type ReportCard = {
  id: string;
  _id: string;
  createdAt: string | null;
  providerName: string;
  displayName: string;
  network: string;
  owner: string;
  active: boolean;
  totals: ReportTotals;
};

export type ReportSummary = {
  generatedAt: string;
  filters: {
    owner: string | null;
    cardId: string | null;
    year: string | null;
    month: string | null;
  };
  totals: ReportTotals;
  cards: ReportCard[];
};

export function reportQuery(filters?: ReportFilters): string;
export function reportApiUrl(filters?: ReportFilters): string;
export function fetchReportSummaryRequest(
  fetcher: typeof fetch,
  filters?: ReportFilters,
): Promise<ReportSummary>;
