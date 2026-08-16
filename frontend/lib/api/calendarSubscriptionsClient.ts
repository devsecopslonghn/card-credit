import type { CalendarSubscriptionCreateDto, CalendarSubscriptionDto } from "@card-credit/contracts";
import { parseCalendarSubscriptionCreate, parseCalendarSubscriptionList } from "./calendarSubscriptionsCore.mjs";

export type CalendarSubscription = CalendarSubscriptionDto;
type ApiErrorBody = { error?: { message?: string } };
const errorFor = async (response: Response, fallback: string) => { const body = await response.json().catch(() => ({})) as ApiErrorBody; return new Error(body.error?.message ?? fallback); };
export const listCalendarSubscriptions = async () => { const response = await fetch("/api/calendar-subscriptions", { cache: "no-store" }); if (!response.ok) throw await errorFor(response, "Không thể tải lịch đăng ký."); const body = await response.json() as { data?: unknown }; return parseCalendarSubscriptionList(body.data) as CalendarSubscription[]; };
export const createCalendarSubscription = async (deviceLabel: string) => { const response = await fetch("/api/calendar-subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceLabel: deviceLabel.trim() || undefined }) }); if (!response.ok) throw await errorFor(response, "Không thể tạo lịch đăng ký."); const body = await response.json() as { data?: unknown }; return parseCalendarSubscriptionCreate(body.data) as CalendarSubscriptionCreateDto; };
export const revokeCalendarSubscription = async (id: string) => { const response = await fetch(`/api/calendar-subscriptions/${encodeURIComponent(id)}`, { method: "DELETE" }); if (!response.ok) throw await errorFor(response, "Không thể thu hồi lịch đăng ký."); };
