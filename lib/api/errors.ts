import { NextResponse } from "next/server";
import {
  ApiError as ApiErrorCore,
  apiErrorResponse as apiErrorResponseCore,
  handleApiError as handleApiErrorCore,
  internalErrorResponse as internalErrorResponseCore,
  parseJsonRequest as parseJsonRequestCore,
} from "./errorsCore.mjs";

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_JSON"
  | "INVALID_CARD_ID"
  | "INVALID_OWNER"
  | "PRESET_NOT_FOUND"
  | "PRESET_INACTIVE"
  | "PROVIDER_NOT_FOUND"
  | "CARD_NOT_FOUND"
  | "FORBIDDEN_UPDATE_FIELD"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
};

export class ApiError extends ApiErrorCore {
  declare status: number;
  declare code: ApiErrorCode;
  declare fields: Record<string, string> | undefined;

  constructor(status: number, code: ApiErrorCode, message: string, fields?: Record<string, string>) {
    super(status, code, message, fields);
  }
}

export const apiErrorResponse = apiErrorResponseCore as (error: ApiError) => NextResponse<ApiErrorBody>;

export const internalErrorResponse = internalErrorResponseCore as (
  context: string,
  error: unknown,
) => NextResponse<ApiErrorBody>;

export const handleApiError = handleApiErrorCore as (context: string, error: unknown) => NextResponse<ApiErrorBody>;

export const parseJsonRequest = parseJsonRequestCore as (request: Request) => Promise<Record<string, unknown>>;
