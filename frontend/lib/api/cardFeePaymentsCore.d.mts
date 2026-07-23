export type CardFeePaymentForm = {
  id: string;
  paymentDate: string;
  amount: string;
  note: string;
};

export type CardFeePaymentRecord = {
  _id: string;
  userCardId: string;
  paymentDate: string;
  amount: number;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type CardFeePaymentPayload = {
  paymentDate: string;
  amount: number;
  note: string;
};

export function currentDate(now?: Date): string;
export function emptyCardFeePaymentForm(date?: string): CardFeePaymentForm;
export function cardFeePaymentFormFromRecord(
  record: CardFeePaymentRecord,
): CardFeePaymentForm;
export function buildCardFeePaymentPayload(
  form: CardFeePaymentForm,
): CardFeePaymentPayload;
export function sortCardFeePayments(
  records: CardFeePaymentRecord[],
): CardFeePaymentRecord[];
export function fetchCardFeePaymentsRequest(
  fetcher: typeof fetch,
  cardId: string,
): Promise<CardFeePaymentRecord[]>;
export function saveCardFeePaymentRequest(
  fetcher: typeof fetch,
  cardId: string,
  form: CardFeePaymentForm,
): Promise<CardFeePaymentRecord>;
export function deleteCardFeePaymentRequest(
  fetcher: typeof fetch,
  cardId: string,
  feePaymentId: string,
): Promise<void>;
