export const canEmailStatementCalendar = (statement) =>
  Boolean(statement?._id && statement?.statementDate && statement?.paymentDueDate);

export const sendStatementCalendarEmailRequest = async (fetcher, cardId, statementId) => {
  const response = await fetcher(`/api/cards/${encodeURIComponent(cardId)}/statements/${encodeURIComponent(statementId)}/calendar-email`, {
    method: "POST",
  });
  if (!response.ok) {
    let message = "Không thể gửi file lịch. Vui lòng thử lại sau.";
    try {
      const body = await response.json();
      if (typeof body?.error?.message === "string") message = body.error.message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
};
