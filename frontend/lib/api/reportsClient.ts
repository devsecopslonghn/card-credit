import {
  fetchReportSummaryRequest,
  reportApiUrl,
  type ReportFilters,
  type ReportSummary,
} from "./reportsCore.mjs";

export type { ReportFilters, ReportSummary };
export { reportApiUrl };

export const fetchReportSummary = (filters: ReportFilters) =>
  fetchReportSummaryRequest(fetch, filters);
