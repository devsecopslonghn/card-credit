import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { registerRuntimeRoutes } from "../src/runtime-routes.js";
import { InMemoryCatalogRepository } from "../src/catalog.js";
import { InMemoryNotesRepository } from "../src/notes.js";
import { InMemoryMasterdataRepository } from "../src/masterdata.js";
import { REST_ENDPOINTS, parseFastifyRouteInventory, restEndpointKey } from "../src/rest-manifest.js";
import type { AuthRepository } from "../src/auth-repository.js";

const secret = "01234567890123456789012345678901";

test("production REST composition matches the documentation inventory", async () => {
  const catalog = new InMemoryCatalogRepository();
  const app = buildApp({ isReady: () => true }, "silent", catalog, secret);
  const authRepository = {} as AuthRepository;
  registerRuntimeRoutes({
    app,
    auth: { repository: authRepository, secret },
    authRepository,
    catalogRepository: catalog,
    notesRepository: new InMemoryNotesRepository(),
    masterdataRepository: new InMemoryMasterdataRepository(),
    mailService: { sendStatementCalendarEmail: async () => {} },
  });
  await app.ready();
  const actual = parseFastifyRouteInventory(app.printRoutes({ commonPrefix: false }));
  const documented = REST_ENDPOINTS.map(restEndpointKey).sort();
  assert.deepEqual(actual, documented);
  await app.close();
});
