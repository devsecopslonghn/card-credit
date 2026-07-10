import Fastify from "fastify";
import type { DatabaseLifecycle } from "./database.js";
import { installErrorHandler } from "./errors.js";
import { CatalogRepository } from "./catalog.js";

export const buildApp = (
  database: Pick<DatabaseLifecycle, "isReady">,
  logLevel = "info",
  catalog = new CatalogRepository("../frontend/data"),
) => {
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
  app.get("/api/card-catalog/providers", async () => catalog.providers());
  app.get<{ Querystring: { provider?: string } }>("/api/card-catalog/products", async (request) =>
    catalog.list(request.query.provider));
  app.get<{ Params: { presetId: string } }>("/api/card-catalog/products/:presetId", async (request) =>
    catalog.detail(request.params.presetId));
  return app;
};
