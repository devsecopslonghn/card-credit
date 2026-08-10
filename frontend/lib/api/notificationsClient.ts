export type NotificationItem = {
  id: string;
  type: "payment_due";
  status: "success" | "warning" | "alert";
  title: string;
  message: string;
  dueDate: string;
  paymentStatus: string;
  cardId: string;
};

export async function fetchNotifications() {
  const response = await fetch("/api/notifications?limit=50", { cache: "no-store" });
  const body = await response.json() as { data?: NotificationItem[]; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || "Không thể tải thông báo.");
  return body.data ?? [];
}
