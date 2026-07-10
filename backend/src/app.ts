import Fastify from "fastify";
import type { DatabaseLifecycle } from "./database.js";
import { installErrorHandler } from "./errors.js";

export const buildApp = (database: Pick<DatabaseLifecycle, "isReady">, logLevel = "info") => {
  const app = Fastify({
    logger: {
      level: logLevel,
      redact: ["req.headers.authorization", "req.headers.cookie", "password", "token", "mongodbUri"],
    },
    requestIdHeader: "x-request-id",
  });

  installErrorHandler(app);
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    if (!database.isReady()) return reply.status(503).send({ status: "not_ready" });
    return { status: "ready" };
  });
  return app;
};
