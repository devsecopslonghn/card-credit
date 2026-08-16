import { monthlyCashbackListSchema, monthlyCashbackSchema } from "@card-credit/contracts";

const fallbackMessage = "Không thể xử lý cashback ngân hàng.";

const apiMessage = async (response, fallback = fallbackMessage) => {
  try {
    const body = await response.json();
    return body?.error?.message || body?.message || fallback;
  } catch {
    return fallback;
  }
};

export const currentPeriod = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export const emptyMonthlyCashbackForm = (period = currentPeriod()) => ({
  period,
  expectedAmount: "",
  actualAmount: "",
  status: "PENDING",
  note: "",
});

export const monthlyCashbackFormFromRecord = (record) => ({
  period: record.period,
  expectedAmount: String(record.expectedAmount),
  actualAmount:
    record.actualAmount === null || record.actualAmount === undefined
      ? ""
      : String(record.actualAmount),
  status: record.status,
  note: record.note ?? "",
});

const nonNegativeInteger = (value, field) => {
  if (value === "" || value === null || value === undefined)
    throw new Error(`${field} là bắt buộc.`);
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error(`${field} phải là số nguyên VND không âm.`);
  return amount;
};

export const buildMonthlyCashbackPayload = (form) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.period))
    throw new Error("Tháng cashback không hợp lệ.");
  if (!["PENDING", "RECEIVED", "REJECTED"].includes(form.status))
    throw new Error("Trạng thái cashback không hợp lệ.");
  return {
    period: form.period,
    payload: {
      expectedAmount: nonNegativeInteger(
        form.expectedAmount,
        "Cashback dự kiến",
      ),
      actualAmount:
        form.status === "RECEIVED"
          ? nonNegativeInteger(form.actualAmount, "Cashback thực nhận")
          : null,
      status: form.status,
      note: String(form.note ?? "").trim(),
    },
  };
};

export const sortMonthlyCashbacks = (records) =>
  [...records].sort((left, right) => right.period.localeCompare(left.period));

export const fetchMonthlyCashbacksRequest = async (
  fetcher,
  cardId,
  year,
) => {
  const response = await fetcher(
    `/api/cards/${encodeURIComponent(cardId)}/monthly-cashbacks?year=${encodeURIComponent(year)}`,
    { cache: "no-store" },
  );
  if (!response.ok)
    throw new Error(
      await apiMessage(response, "Không thể tải cashback ngân hàng."),
    );
  const body = await response.json();
  return sortMonthlyCashbacks(monthlyCashbackListSchema.parse(body?.data ?? []));
};

const parseMutationCashback = (value, cardId, period) => {
  const item = value && typeof value === "object" ? value : {};
  return monthlyCashbackSchema.parse({
    id: item.id ?? item._id,
    cardId: item.cardId ?? item.userCardId ?? cardId,
    period: item.period ?? period,
    expectedAmount: item.expectedAmount,
    actualAmount: item.status === "RECEIVED" ? item.actualAmount ?? null : null,
    status: item.status,
    receivedAt: item.receivedAt ?? null,
    note: item.note ?? "",
  });
};

export const upsertMonthlyCashbackRequest = async (
  fetcher,
  cardId,
  form,
) => {
  const { period, payload } = buildMonthlyCashbackPayload(form);
  const response = await fetcher(
    `/api/cards/${encodeURIComponent(cardId)}/monthly-cashbacks/${encodeURIComponent(period)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok)
    throw new Error(
      await apiMessage(response, "Không thể lưu cashback ngân hàng."),
    );
  const body = await response.json();
  return parseMutationCashback(body.data, cardId, period);
};

export const deleteMonthlyCashbackRequest = async (
  fetcher,
  cardId,
  period,
) => {
  const response = await fetcher(
    `/api/cards/${encodeURIComponent(cardId)}/monthly-cashbacks/${encodeURIComponent(period)}`,
    { method: "DELETE" },
  );
  if (!response.ok)
    throw new Error(
      await apiMessage(response, "Không thể xóa cashback ngân hàng."),
    );
};
