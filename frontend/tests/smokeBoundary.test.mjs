import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const smokeScript = await readFile(new URL("../scripts/smoke-test.mjs", import.meta.url), "utf8");

test("deployment smoke test keeps backend readiness checks explicitly opt-in", () => {
  assert.match(smokeScript, /SMOKE_BACKEND_BASE_URL/);
  assert.match(smokeScript, /expectJson\("\/health", "backend health", backendBaseUrl\)/);
  assert.match(smokeScript, /expectJson\("\/ready", "backend readiness", backendBaseUrl\)/);
  assert.match(smokeScript, /readiness\.status !== "ready"/);
});

test("deployment smoke test remains read-only and does not send mutation methods", () => {
  assert.doesNotMatch(smokeScript, /method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
});
