import {
  deleteCardFeePaymentRequest,
  fetchCardFeePaymentsRequest,
  saveCardFeePaymentRequest,
  type CardFeePaymentForm,
  type CardFeePaymentRecord,
} from "./cardFeePaymentsCore.mjs";

export type { CardFeePaymentForm, CardFeePaymentRecord };

export const fetchCardFeePayments = (cardId: string) =>
  fetchCardFeePaymentsRequest(fetch, cardId);

export const saveCardFeePayment = (
  cardId: string,
  form: CardFeePaymentForm,
) => saveCardFeePaymentRequest(fetch, cardId, form);

export const deleteCardFeePayment = (
  cardId: string,
  feePaymentId: string,
) => deleteCardFeePaymentRequest(fetch, cardId, feePaymentId);
