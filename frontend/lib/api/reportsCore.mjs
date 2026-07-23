const apiError = async (response, fallback) => {
  try {
    const body = await response.json();
    return body?.error?.message || body?.message || fallback;
  } catch {
    return fallback;
  }
};

export const reportQuery = (filters = {}) => {
  const query = new URLSearchParams();
  if (filters.owner) query.set("owner", filters.owner);
  if (filters.cardId) query.set("cardId", filters.cardId);
  if (filters.year) query.set("year", filters.year);
  if (filters.year && filters.month) query.set("month", filters.month);
  return query.toString();
};

export const reportApiUrl = (filters = {}) => {
  const query = reportQuery(filters);
  return `/api/reports/summary${query ? `?${query}` : ""}`;
};

export const fetchReportSummaryRequest = async (fetcher, filters = {}) => {
  const response = await fetcher(reportApiUrl(filters), { cache: "no-store" });
  if (!response.ok)
    throw new Error(
      await apiError(response, "Không thể tải báo cáo hiệu quả thẻ."),
    );
  return response.json();
};
