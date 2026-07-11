import assert from "node:assert/strict";
import test from "node:test";
import { createApiErrorBody, isApiErrorBody } from "../src/index.js";

test("creates and recognizes the stable error envelope", () => {
  const body = createApiErrorBody("INVALID_REQUEST", "Invalid", { name: "Required" });
  assert.deepEqual(body, {
    error: { code: "INVALID_REQUEST", message: "Invalid", fields: { name: "Required" } },
  });
  assert.equal(isApiErrorBody(body), true);
  assert.equal(isApiErrorBody({ message: "no" }), false);
});
