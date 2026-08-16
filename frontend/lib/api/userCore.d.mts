import type { UserDto } from "@card-credit/contracts";

export declare const parseUser: (value: unknown) => UserDto;
export declare const parseUserList: (value: unknown) => UserDto[];
export declare const parseUserResponse: (value: unknown) => { user: UserDto };
export declare const parseUserListResponse: (value: unknown) => { users: UserDto[] };
