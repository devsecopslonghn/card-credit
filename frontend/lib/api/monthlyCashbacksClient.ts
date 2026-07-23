import {
  deleteMonthlyCashbackRequest,
  fetchMonthlyCashbacksRequest,
  upsertMonthlyCashbackRequest,
  type MonthlyCashbackForm,
  type MonthlyCashbackRecord,
  type MonthlyCashbackStatus,
} from "./monthlyCashbacksCore.mjs";

export type {
  MonthlyCashbackForm,
  MonthlyCashbackRecord,
  MonthlyCashbackStatus,
};

export const fetchMonthlyCashbacks = (cardId: string, year: string) =>
  fetchMonthlyCashbacksRequest(fetch, cardId, year);

export const upsertMonthlyCashback = (
  cardId: string,
  form: MonthlyCashbackForm,
) => upsertMonthlyCashbackRequest(fetch, cardId, form);

export const deleteMonthlyCashback = (cardId: string, period: string) =>
  deleteMonthlyCashbackRequest(fetch, cardId, period);
