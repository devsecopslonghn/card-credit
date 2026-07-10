import type { FastifyError, FastifyInstance } from "fastify";

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const installErrorHandler = (app: FastifyInstance) => {
  app.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
    const known = error instanceof ApiError;
    const statusCode = known ? error.statusCode : 500;
    request.log.error({ err: error, event: "REQUEST_FAILED" }, error.message);
    return reply.status(statusCode).send({
      error: {
        code: known ? error.code : "INTERNAL_ERROR",
        message: known ? error.message : "Internal server error.",
        ...(known && error.fields ? { fields: error.fields } : {}),
      },
    });
  });
};
