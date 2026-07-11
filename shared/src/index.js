/**
 * Creates the stable API error envelope shared by browser and server adapters.
 * This module is deliberately pure: it must never import environment, database,
 * framework, authentication, or logging code.
 */
export const createApiErrorBody = (code, message, fields) => ({
  error: {
    code,
    message,
    ...(fields ? { fields } : {}),
  },
});

export const isApiErrorBody = (value) => Boolean(
  value &&
  typeof value === "object" &&
  "error" in value &&
  value.error &&
  typeof value.error === "object" &&
  "code" in value.error &&
  typeof value.error.code === "string" &&
  "message" in value.error &&
  typeof value.error.message === "string",
);
