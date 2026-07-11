import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { DatabaseLifecycle } from "./database.js";
import { MongoCatalogRepository } from "./mongo-catalog-repository.js";
import { writeAuthAudit, writeCatalogAudit } from "./catalog-audit.js";
import { MongoAuthRepository } from "./auth-repository.js";
import { registerAuthRoutes } from "./auth-routes.js";
import { MongoNotesRepository } from "./notes.js";
import { registerNotesRoutes } from "./notes-routes.js";
import { MongoMasterdataRepository } from "./masterdata.js";
import { registerMasterdataRoutes } from "./masterdata-routes.js";
import { registerUserRoutes } from "./user-routes.js";
import { registerCardRoutes } from "./card-routes.js";
import { registerTransactionRoutes } from "./transaction-routes.js";
import { registerReportRoutes } from "./report-routes.js";

const config = loadConfig();
const database = new DatabaseLifecycle();
const app = buildApp(database, config.logLevel, new MongoCatalogRepository(), config.authSecret, writeCatalogAudit);
const authRepository = new MongoAuthRepository();
registerAuthRoutes(app, { repository: authRepository, secret: config.authSecret, bootstrapToken: config.bootstrapToken, configuredUsers: config.configuredUsers, returnResetToken: config.returnResetToken, audit: writeAuthAudit });
registerUserRoutes(app, authRepository, config.authSecret);
registerCardRoutes(app, config.authSecret);
registerTransactionRoutes(app, config.authSecret);
registerReportRoutes(app, config.authSecret);
registerNotesRoutes(app, new MongoNotesRepository(), config.authSecret);
registerMasterdataRoutes(app, new MongoMasterdataRepository(), config.authSecret);
let stopping = false;

const shutdown = async (signal: string) => {
  if (stopping) return;
  stopping = true;
  app.log.info({ event: "SHUTDOWN_STARTED", signal });
  const timeout = setTimeout(() => process.exit(1), config.shutdownTimeoutMs).unref();
  try {
    await app.close();
    await database.disconnect();
    clearTimeout(timeout);
    app.log.info({ event: "SHUTDOWN_COMPLETE" });
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error, event: "SHUTDOWN_FAILED" });
    process.exit(1);
  }
};

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ host: config.host, port: config.port });
  app.log.info({ event: "SERVER_LISTENING", host: config.host, port: config.port });
  void database.connect(config.mongodbUri).catch((error) => {
    app.log.error({ err: error, event: "DATABASE_CONNECTION_FAILED" });
  });
} catch (error) {
  app.log.fatal({ err: error, event: "STARTUP_FAILED" });
  await database.disconnect();
  process.exit(1);
}
