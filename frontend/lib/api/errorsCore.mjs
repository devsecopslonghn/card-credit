import { NextResponse } from "next/server.js";
import { createApiErrorBody } from "@card-credit/contracts";
import { errorContext, logError } from "../observability/logger.mjs";

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const apiErrorResponse = (error) =>
  NextResponse.json(
    createApiErrorBody(error.code, error.message, error.fields),
    { status: error.status },
  );

export const internalErrorResponse = (context, error) => {
  logError("DATABASE_ERROR", {
    route: context,
    ...errorContext(error),
  });
  return apiErrorResponse(new ApiError(500, "INTERNAL_ERROR", "Lỗi hệ thống."));
};

export const handleApiError = (context, error) => {
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
        error.code,
        error.message,
        "fields" in error && error.fields && typeof error.fields === "object" ? error.fields : undefined,
      ),
    );
  }
  return internalErrorResponse(context, error);
};

export const parseJsonRequest = async (request) => {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "INVALID_REQUEST", "Request body không hợp lệ.");
    }
    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "INVALID_JSON", "Request body phải là JSON hợp lệ.");
  }
};
