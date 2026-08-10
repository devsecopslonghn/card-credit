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
import { SmtpMailService } from "./mail-service.js";
import { ReminderScheduler } from "./reminder-scheduler.js";
import { registerWorkspaceRoutes } from "./workspace-routes.js";
import { registerCalendarSubscriptionRoutes } from "./calendar-subscription-routes.js";
import { registerMonthlyCardCashbackRoutes } from "./monthly-card-cashback-routes.js";
import { registerCardFeePaymentRoutes } from "./card-fee-payment-routes.js";
import { registerNotificationRoutes } from "./notification-routes.js";
import { registerFeeCenterRoutes } from "./fee-center-routes.js";
import { registerCashFlowRoutes } from "./cash-flow-routes.js";
import { syncCatalogFromFile } from "./catalog-sync.js";

const config = loadConfig();
const database = new DatabaseLifecycle();
const app = buildApp(database, config.logLevel, new MongoCatalogRepository(), config.authSecret, writeCatalogAudit);
const authRepository = new MongoAuthRepository();
registerAuthRoutes(app, { repository: authRepository, secret: config.authSecret, bootstrapToken: config.bootstrapToken, configuredUsers: config.configuredUsers, returnResetToken: config.returnResetToken, audit: writeAuthAudit });
registerUserRoutes(app, authRepository, config.authSecret);
registerWorkspaceRoutes(app, authRepository, config.authSecret);
registerCalendarSubscriptionRoutes(app, authRepository, config.authSecret);
registerCardRoutes(app, config.authSecret);
registerMonthlyCardCashbackRoutes(app, config.authSecret);
registerCardFeePaymentRoutes(app, config.authSecret);
registerNotificationRoutes(app, config.authSecret);
registerFeeCenterRoutes(app, config.authSecret);
registerCashFlowRoutes(app, config.authSecret);
const mailService = new SmtpMailService();
registerTransactionRoutes(app, config.authSecret, { users: authRepository, mail: mailService });
const reminderScheduler = new ReminderScheduler(authRepository, mailService, config.reminderScanIntervalMs, config.reminderClaimTimeoutMs, app.log);
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
    reminderScheduler.stop();
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
  await database.connect(config.mongodbUri);
  const catalogSync = await syncCatalogFromFile();
  app.log.info({ event: "CATALOG_STARTUP_SYNC_COMPLETED", ...catalogSync });
  await app.listen({ host: config.host, port: config.port });
  app.log.info({ event: "SERVER_LISTENING", host: config.host, port: config.port });
  reminderScheduler.start();
} catch (error) {
  app.log.fatal({ err: error, event: "STARTUP_FAILED" });
  await database.disconnect();
  process.exit(1);
}
