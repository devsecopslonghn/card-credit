import { ApiError } from "./errors.js";

export type AccountType = "DEBIT" | "CASH" | "E_WALLET" | "CREDIT";
export type AccountGroup = "REAL_MONEY" | "DEBT";
export const accountGroup = (type: AccountType): AccountGroup => type === "CREDIT" ? "DEBT" : "REAL_MONEY";
export type Ownership = "PERSONAL" | "PAID_FOR_OTHER";
export type FinancialTransactionType =
  | "EXPENSE"
  | "TRANSFER"
  | "REIMBURSEMENT"
  | "REFUND"
  | "CASHBACK"
  | "INCOME"
  | "STATEMENT_PAYMENT";

export type FinancialTransactionInput = {
  accountType: AccountType;
  transactionType?: FinancialTransactionType;
  ownership?: Ownership;
  amount: number;
  reimbursementExpected?: number;
  refundReceived?: number;
  cashbackReceived?: number;
};

export type FinancialTransactionImpact = {
  grossAmount: number;
  personalSpending: number;
  debitCashflow: number;
  creditDebt: number;
  outstandingReceivable: number;
  reimbursementReceived: number;
};

const integerAmount = (value: number, field: string) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ApiError(400, "INVALID_AMOUNT", "Số tiền không hợp lệ.", {
      [field]: "Phải là số nguyên không âm trong giới hạn an toàn.",
    });
  }
  return value;
};

/**
 * Calculates the three independent financial views for one transaction.
 * Credit charges create debt; statement payments settle debt and are not a
 * second personal expense. Debit/cash movement represents money actually held.
 */
export const calculateFinancialImpact = (
  input: FinancialTransactionInput,
): FinancialTransactionImpact => {
  const amount = integerAmount(input.amount, "amount");
  if (amount === 0) {
    throw new ApiError(400, "INVALID_AMOUNT", "Số tiền phải lớn hơn 0.");
  }
  const type = input.transactionType ?? "EXPENSE";
  const ownership = input.ownership ?? "PERSONAL";
  const reimbursementExpected = integerAmount(
    input.reimbursementExpected ?? 0,
    "reimbursementExpected",
  );
  const refundReceived = integerAmount(
    input.refundReceived ?? 0,
    "refundReceived",
  );
  if (reimbursementExpected + refundReceived > amount) {
    throw new ApiError(
      400,
      "INVALID_OFFSET_AMOUNT",
      "Tổng tiền hoàn không được lớn hơn số tiền giao dịch.",
    );
  }

  const isOutflow = type === "EXPENSE";
  const isCreditCharge = input.accountType === "CREDIT" && isOutflow;
  const isDebitOutflow =
    (input.accountType !== "CREDIT") &&
    (isOutflow || type === "STATEMENT_PAYMENT");
  const isDebitInflow =
    (input.accountType !== "CREDIT") &&
    ["REIMBURSEMENT", "REFUND", "CASHBACK", "INCOME"].includes(type);
  const personalSpending = isOutflow
    ? Math.max(
        0,
        amount - (ownership === "PAID_FOR_OTHER" ? reimbursementExpected : 0) - refundReceived,
      )
    : 0;

  return {
    grossAmount: amount,
    personalSpending,
    debitCashflow: isDebitOutflow ? -amount : isDebitInflow ? amount : 0,
    creditDebt: isCreditCharge ? amount : type === "STATEMENT_PAYMENT" ? -amount : 0,
    outstandingReceivable:
      type === "EXPENSE" && ownership === "PAID_FOR_OTHER"
        ? reimbursementExpected
        : 0,
    reimbursementReceived: type === "REIMBURSEMENT" ? amount : 0,
  };
};
