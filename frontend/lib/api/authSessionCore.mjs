import { authSessionListSchema, authSessionSchema } from "@card-credit/contracts";

const objectValue = (value) => value && typeof value === "object" ? value : {};

export const parseAuthSession = (value) => authSessionSchema.parse(value);
export const parseAuthSessionList = (value) => authSessionListSchema.parse(value);
export const parseAuthSessionResponse = (value) => ({ user: parseAuthSession(objectValue(value).user) });
export const parseAuthSessionListResponse = (value) => ({ users: parseAuthSessionList(objectValue(value).users) });
