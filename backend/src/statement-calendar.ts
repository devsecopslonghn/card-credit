import crypto from "node:crypto";

export type StatementCalendarEvent = {
  key: string;
  type: "statement" | "payment-due";
  date: string;
  title: string;
  description: string;
};

export type StatementCalendarInput = {
  identity: string;
  displayName: string;
  providerName: string;
  owner: string;
  periodStartDate: string;
  periodEndDate: string;
  statementDate: string;
  paymentDueDate: string;
  totalAmountDue: number;
  effectivePaymentStatus: string;
};

const statusLabel: Record<string, string> = {
  OPEN: "Đang mở",
  STATEMENT_CLOSED: "Đã chốt sao kê",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn",
};

export const projectStatementCalendar = (input: StatementCalendarInput): StatementCalendarEvent[] => {
  const common = [
    `Thẻ: ${input.displayName}`,
    `Ngân hàng: ${input.providerName}`,
    `Chủ thẻ: ${input.owner}`,
    `Kỳ sao kê: ${input.periodStartDate} – ${input.periodEndDate}`,
    `Tổng phải trả: ${Math.round(input.totalAmountDue).toLocaleString("vi-VN")} VND`,
    `Trạng thái: ${statusLabel[input.effectivePaymentStatus] ?? input.effectivePaymentStatus}`,
    `Ngày chốt: ${input.statementDate}`,
    `Hạn thanh toán: ${input.paymentDueDate}`,
  ].join("\n");
  const key = (type: StatementCalendarEvent["type"]) =>
    crypto.createHash("sha256").update(`${input.identity}:${type}`).digest("hex");
  return [
    { key: key("statement"), type: "statement", date: input.statementDate, title: `Chốt sao kê – ${input.displayName}`, description: common },
    { key: key("payment-due"), type: "payment-due", date: input.paymentDueDate, title: `Hạn thanh toán – ${input.displayName}`, description: common },
  ];
};

const escapeText = (value: string) => value
  .replaceAll("\\", "\\\\")
  .replaceAll("\r\n", "\\n")
  .replaceAll("\n", "\\n")
  .replaceAll("\r", "\\n")
  .replaceAll(",", "\\,")
  .replaceAll(";", "\\;");

const utf8Length = (value: string) => Buffer.byteLength(value, "utf8");
const foldLine = (line: string) => {
  if (utf8Length(line) <= 75) return line;
  const lines: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = lines.length === 0 ? 75 : 74;
    if (utf8Length(current + char) > limit) {
      lines.push(current);
      current = char;
    } else current += char;
  }
  lines.push(current);
  return lines.join("\r\n ");
};

const compactDate = (value: string) => value.replaceAll("-", "");
const nextDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + 1));
  return `${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, "0")}${String(next.getUTCDate()).padStart(2, "0")}`;
};
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

export const serializeStatementCalendar = (events: StatementCalendarEvent[], generatedAt = new Date()) => {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Card Credit//Statement Calendar//VI", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const event of events) lines.push(
    "BEGIN:VEVENT",
    `UID:${event.key}@card-credit`,
    `DTSTAMP:${stamp(generatedAt)}`,
    `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
    `DTEND;VALUE=DATE:${nextDate(event.date)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    "END:VEVENT",
  );
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
};
