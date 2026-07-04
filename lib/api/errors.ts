import { NextResponse } from "next/server";

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

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  fields?: Record<string, string>;

  constructor(status: number, code: ApiErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const apiErrorResponse = (error: ApiError) =>
  NextResponse.json<ApiErrorBody>(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    },
    { status: error.status },
  );

export const internalErrorResponse = (context: string, error: unknown) => {
  console.error(context, error);
  return apiErrorResponse(new ApiError(500, "INTERNAL_ERROR", "Lỗi hệ thống."));
};

export const handleApiError = (context: string, error: unknown) => {
  if (error instanceof ApiError) return apiErrorResponse(error);
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    "code" in error &&
    "message" in error &&
    typeof error.status === "number" &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  ) {
    return apiErrorResponse(
      new ApiError(
        error.status,
        error.code as ApiErrorCode,
        error.message,
        "fields" in error && error.fields && typeof error.fields === "object"
          ? (error.fields as Record<string, string>)
          : undefined,
      ),
    );
  }
  return internalErrorResponse(context, error);
};

export const parseJsonRequest = async (request: Request): Promise<Record<string, unknown>> => {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "INVALID_REQUEST", "Request body không hợp lệ.");
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "INVALID_JSON", "Request body phải là JSON hợp lệ.");
  }
};
