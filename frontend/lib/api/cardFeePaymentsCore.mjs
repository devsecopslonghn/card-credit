const fallbackMessage = "Không thể xử lý phí thẻ đã đóng.";

const apiMessage = async (response, fallback = fallbackMessage) => {
  try {
    const body = await response.json();
    return body?.error?.message || body?.message || fallback;
  } catch {
    return fallback;
  }
};

export const currentDate = (now = new Date()) => {
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

export const emptyCardFeePaymentForm = (date = currentDate()) => ({
  id: "",
  paymentDate: date,
  amount: "",
  note: "",
});

export const cardFeePaymentFormFromRecord = (record) => ({
  id: record._id,
  paymentDate: record.paymentDate,
  amount: String(record.amount),
  note: record.note ?? "",
});

export const buildCardFeePaymentPayload = (form) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(form.paymentDate))
    throw new Error("Ngày đóng phí không hợp lệ.");
  const amount = Number(form.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new Error("Số tiền phải là số nguyên VND lớn hơn 0.");
  const note = String(form.note ?? "").trim();
  if (note.length > 1000) throw new Error("Ghi chú tối đa 1000 ký tự.");
  return { paymentDate: form.paymentDate, amount, note };
};

export const sortCardFeePayments = (records) =>
  [...records].sort(
    (left, right) =>
      right.paymentDate.localeCompare(left.paymentDate) ||
      String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")),
  );

export const fetchCardFeePaymentsRequest = async (fetcher, cardId) => {
  const response = await fetcher(
    `/api/cards/${encodeURIComponent(cardId)}/fee-payments`,
    { cache: "no-store" },
  );
  if (!response.ok)
    throw new Error(await apiMessage(response, "Không thể tải phí thẻ đã đóng."));
  const body = await response.json();
  return sortCardFeePayments(body?.data ?? []);
};

export const saveCardFeePaymentRequest = async (fetcher, cardId, form) => {
  const payload = buildCardFeePaymentPayload(form);
  const editing = Boolean(form.id);
  const response = await fetcher(
    `/api/cards/${encodeURIComponent(cardId)}/fee-payments${editing ? `/${encodeURIComponent(form.id)}` : ""}`,
    {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok)
    throw new Error(await apiMessage(response, "Không thể lưu phí thẻ."));
  const body = await response.json();
  return body.data;
};

export const deleteCardFeePaymentRequest = async (
  fetcher,
  cardId,
  feePaymentId,
) => {
  const response = await fetcher(
    `/api/cards/${encodeURIComponent(cardId)}/fee-payments/${encodeURIComponent(feePaymentId)}`,
    { method: "DELETE" },
  );
  if (!response.ok)
    throw new Error(await apiMessage(response, "Không thể xóa phí thẻ."));
};
