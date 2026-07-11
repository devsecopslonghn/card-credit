export function canEmailStatementCalendar(statement: { _id?: string; statementDate?: string; paymentDueDate?: string } | null | undefined): boolean;
export function sendStatementCalendarEmailRequest(
  fetcher: typeof fetch,
  cardId: string,
  statementId: string,
): Promise<{ data: { sent: true; recipient: string } }>;
