import type { AuthSessionDto } from "@card-credit/contracts";

export declare const parseAuthSession: (value: unknown) => AuthSessionDto;
export declare const parseAuthSessionList: (value: unknown) => AuthSessionDto[];
export declare const parseAuthSessionResponse: (value: unknown) => { user: AuthSessionDto };
export declare const parseAuthSessionListResponse: (value: unknown) => { users: AuthSessionDto[] };
