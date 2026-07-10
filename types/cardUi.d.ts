declare module "@/lib/cards/uiCore.mjs" {
  export const CARD_IMAGE_PLACEHOLDER_URL: string;
  export const MAX_OWNER_LENGTH: number;
  export const normalizeOwnerInput: (owner: unknown) => string;
  export const validateOwnerInput: (owner: unknown) => { valid: boolean; owner: string; message: string };
  export const buildCreateCardPayload: (presetId: string, owner: string) => { presetId: string; owner: string };
  export const formatVnd: (value: unknown) => string;
  export const formatAnnualFee: (value: unknown) => string;
  export const formatDateDisplay: (dateStr: unknown) => string;
  export const formatRateBps: (value: unknown) => string;
  export const buildCardSummary: (
    card: Record<string, unknown>,
    statements?: Array<
      Record<string, unknown> & {
        statementDate?: string;
        paymentStatus?: string;
        effectivePaymentStatus?: string;
        summary?: { totalAmountDue?: number };
      }
    >,
    selectedPeriod?: { year?: number; month?: number },
  ) => {
    statementDate: string;
    paymentDueDate: string;
    currentOutstandingBalance: number;
    statementAmountDue: number;
  };
  export const getProviderName: (card: Record<string, unknown>) => string;
  export const getProviderKey: (card: Record<string, unknown>) => string;
  export const getDisplayName: (card: Record<string, unknown>) => string;
  export const getNetwork: (card: Record<string, unknown>) => string;
  export const isLegacyCard: (card: Record<string, unknown>) => boolean;
  export const compareCards: (left: Record<string, unknown>, right: Record<string, unknown>) => number;
  export const groupCardsByProvider: <T extends Record<string, unknown>>(
    cards: T[],
  ) => Array<{ providerKey: string; providerName: string; cards: T[] }>;
  export const getUniqueOwners: (cards: Array<Record<string, unknown>>) => string[];
  export const filterCardsByOwner: <T extends Record<string, unknown>>(cards: T[], owner: string) => T[];
  export const getUpcomingPayments: <T extends Record<string, unknown>>(cards: T[]) => T[];
  export const defaultMonthlyData: () => Array<{
    month: number;
    spend: number;
    cashback: number;
    fee: number;
    otherInterest: number;
  }>;
  export const getMonthlyData: (card: Record<string, unknown>) => Array<Record<string, unknown>>;
  export const numberOrZero: (value: unknown) => number;
  export const getAnnualFeeForCalculation: (annualFee: unknown) => number;
  export const calculateCardMetrics: (card: Record<string, unknown>) => {
    monthlyData: Array<Record<string, unknown>>;
    totalSpend: number;
    totalCashback: number;
    totalFee: number;
    totalOtherInterest: number;
    targetSpendForWaiver: number;
    annualFeeKnown: boolean;
    annualFeeForCalculation: number;
    annualFeeApplied: number;
    remainingSpend: number;
    isWaved: boolean;
    netProfit: number;
  };
  export const calculateMonthNet: (month: Record<string, unknown>) => number;
  export const buildOperationalUpdatePayload: (input: Record<string, unknown>) => Record<string, unknown>;
}

declare module "@/lib/reports/summaryCore.mjs" {
  export const buildReportSummary: (input: {
    cards?: Array<Record<string, unknown>>;
    notes?: Array<Record<string, unknown>>;
    filters?: Record<string, unknown>;
  }) => Record<string, unknown>;
  export const buildTransactionReportSummary: (input: {
    cards?: Array<Record<string, unknown>>;
    statements?: Array<Record<string, unknown>>;
    transactions?: Array<Record<string, unknown>>;
    filters?: Record<string, unknown>;
  }) => Record<string, unknown>;
}

declare module "@/lib/cards/dueStatementsCore.mjs" {
  export type DueStatementStatus = "UPCOMING" | "DUE_TODAY" | "OVERDUE" | "PAID";
  export type DueStatementRow = {
    statement: Record<string, unknown> & {
      _id: string;
      userCardId: string;
      statementDate: string;
      paymentDueDate: string;
      paymentStatus?: string;
      effectivePaymentStatus?: string;
      summary?: { totalAmountDue?: number };
    };
    card: Record<string, unknown> & {
      _id: string;
      providerName?: string;
      bank?: string;
      displayName?: string;
      name?: string;
      owner?: string;
    };
    amountDue: number;
    status: DueStatementStatus;
  };
  export const getStatementDueStatus: (statement: Record<string, unknown>, today?: string) => DueStatementStatus;
  export const buildDueStatementGroups: (input: {
    statements?: Array<Record<string, unknown>>;
    cards?: Array<Record<string, unknown>>;
    today?: string;
  }) => Array<{
    monthKey: string;
    monthLabel: string;
    dueCount: number;
    dueAmount: number;
    rows: DueStatementRow[];
  }>;
  export const buildOverdueStatementRows: (input: {
    statements?: Array<Record<string, unknown>>;
    cards?: Array<Record<string, unknown>>;
    today?: string;
  }) => DueStatementRow[];
}

declare module "@/lib/cards/cardDebtCore.mjs" {
  export const isOutstandingDebtStatement: (statement: Record<string, unknown>, today?: string) => boolean;
  export const summarizeCardDebt: (
    statements?: Array<
      Record<string, unknown> & {
        statementDate?: string;
        paymentDueDate?: string;
        paymentStatus?: string;
        effectivePaymentStatus?: string;
        summary?: { totalAmountDue?: number };
      }
    >,
    today?: string,
  ) => {
    totalOutstanding: number;
    outstandingCount: number;
    currentMonthDue: number;
    currentMonthDueCount: number;
    nextMonthDue: number;
    nextMonthDueCount: number;
    currentMonthKey: string;
    nextMonthKey: string;
  };
}
