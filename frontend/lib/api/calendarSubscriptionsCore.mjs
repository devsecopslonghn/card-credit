import { calendarSubscriptionCreateSchema, calendarSubscriptionListSchema } from "@card-credit/contracts";

export const parseCalendarSubscriptionList = (value) => calendarSubscriptionListSchema.parse(value);
export const parseCalendarSubscriptionCreate = (value) => calendarSubscriptionCreateSchema.parse(value);
