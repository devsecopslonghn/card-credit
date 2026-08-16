import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.js";

test("loads safe runtime defaults", () => {
  const config = loadConfig({
    MONGODB_URI: "mongodb://127.0.0.1/card-credit-test",
    AUTH_SECRET: "01234567890123456789012345678901",
  });
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.port, 3001);
  assert.equal(config.sessionMaxAgeMs, 28_800_000);
});

test("rejects missing or short secrets", () => {
  assert.throws(() => loadConfig({ MONGODB_URI: "mongodb://127.0.0.1/test" }), /AUTH_SECRET is required/);
  assert.throws(() => loadConfig({ MONGODB_URI: "mongodb://127.0.0.1/test", AUTH_SECRET: "short" }), /at least 32/);
  assert.throws(() => loadConfig({ MONGODB_URI: "mongodb://127.0.0.1/test", AUTH_SECRET: "01234567890123456789012345678901", AUTH_SESSION_MAX_AGE_MS: "1000" }), /AUTH_SESSION_MAX_AGE_MS/);
});
