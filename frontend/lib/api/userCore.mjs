import { userListSchema, userSchema } from "@card-credit/contracts";

const objectValue = (value) => value && typeof value === "object" ? value : {};

export const parseUser = (value) => userSchema.parse(value);
export const parseUserList = (value) => userListSchema.parse(value);
export const parseUserResponse = (value) => ({ user: parseUser(objectValue(value).user) });
export const parseUserListResponse = (value) => ({ users: parseUserList(objectValue(value).users) });
