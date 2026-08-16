export type MonthlyCashbackStatus = "PENDING" | "RECEIVED" | "REJECTED";

export type MonthlyCashbackForm = {
  period: string;
  expectedAmount: string;
  actualAmount: string;
  status: MonthlyCashbackStatus;
  note: string;
};

export type MonthlyCashbackRecord = {
  id: string;
  cardId: string;
  period: string;
  expectedAmount: number;
  actualAmount: number | null;
  status: MonthlyCashbackStatus;
  receivedAt: string | null;
  note: string;
};

export type MonthlyCashbackPayload = {
  expectedAmount: number;
  actualAmount: number | null;
  status: MonthlyCashbackStatus;
  note: string;
};

export function currentPeriod(now?: Date): string;
export function emptyMonthlyCashbackForm(period?: string): MonthlyCashbackForm;
export function monthlyCashbackFormFromRecord(
  record: MonthlyCashbackRecord,
): MonthlyCashbackForm;
export function buildMonthlyCashbackPayload(form: MonthlyCashbackForm): {
  period: string;
  payload: MonthlyCashbackPayload;
};
export function sortMonthlyCashbacks(
  records: MonthlyCashbackRecord[],
): MonthlyCashbackRecord[];
export function fetchMonthlyCashbacksRequest(
  fetcher: typeof fetch,
  cardId: string,
  year: string,
): Promise<MonthlyCashbackRecord[]>;
export function upsertMonthlyCashbackRequest(
  fetcher: typeof fetch,
  cardId: string,
  form: MonthlyCashbackForm,
): Promise<MonthlyCashbackRecord>;
export function deleteMonthlyCashbackRequest(
  fetcher: typeof fetch,
  cardId: string,
  period: string,
): Promise<void>;
