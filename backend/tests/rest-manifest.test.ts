import assert from "node:assert/strict";
import test from "node:test";
import { REST_ENDPOINTS, restEndpointKey } from "../src/rest-manifest.js";

test("REST documentation inventory has unique method/path entries and explicit security", () => {
  const keys = REST_ENDPOINTS.map(restEndpointKey);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(REST_ENDPOINTS.length >= 40);
  assert.equal(REST_ENDPOINTS.every(({ security }) => ["public", "session", "bearer"].includes(security)), true);
  assert.equal(REST_ENDPOINTS.some(({ path }) => path === "/mcp"), false);
});
