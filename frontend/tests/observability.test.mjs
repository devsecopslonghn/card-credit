import assert from "node:assert/strict";
import { test } from "node:test";
import { errorContext, logError, logInfo } from "../lib/observability/logger.mjs";

const captureConsole = async (method, fn) => {
  const original = console[method];
  const lines = [];
  console[method] = (line) => lines.push(line);
  try {
    await fn();
  } finally {
    console[method] = original;
  }
  return lines;
};

test("structured logger emits timestamp event code and context", async () => {
  const lines = await captureConsole("log", () =>
    logInfo("CARD_CREATE_SUCCESS", {
      presetId: "sacombank-visa-platinum-cashback",
      cardId: "507f1f77bcf86cd799439011",
    }),
  );
  const entry = JSON.parse(lines[0]);

  assert.equal(entry.level, "info");
  assert.equal(entry.event, "CARD_CREATE_SUCCESS");
  assert.equal(entry.context.presetId, "sacombank-visa-platinum-cashback");
  assert.equal(entry.context.cardId, "507f1f77bcf86cd799439011");
  assert.match(entry.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test("structured logger redacts connection strings and secret-like fields", async () => {
  const lines = await captureConsole("error", () =>
    logError("DATABASE_ERROR", {
      mongoUri: "mongodb+srv://user:password@example.test/cards",
      connectionString: "mongodb://localhost:27017/cards",
      presetId: "preset-a",
      cardId: "card-a",
    }),
  );
  const entry = JSON.parse(lines[0]);
  const serialized = JSON.stringify(entry);

  assert.equal(entry.context.mongoUri, "[redacted]");
  assert.equal(entry.context.connectionString, "[redacted]");
  assert.equal(entry.context.presetId, "preset-a");
  assert.equal(entry.context.cardId, "card-a");
  assert.equal(serialized.includes("password@example"), false);
  assert.equal(serialized.includes("mongodb://"), false);
});

test("error context excludes stack traces", () => {
  const error = new Error("database unavailable");
  const context = errorContext(error);

  assert.equal(context.errorName, "Error");
  assert.equal(context.errorMessage, "database unavailable");
  assert.equal("stack" in context, false);
});
