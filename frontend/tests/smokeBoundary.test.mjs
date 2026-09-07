import { createServer } from "node:http";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const smokeScript = await readFile(new URL("../scripts/smoke-test.mjs", import.meta.url), "utf8");
const smokeScriptPath = fileURLToPath(new URL("../scripts/smoke-test.mjs", import.meta.url));
const frontendRoot = fileURLToPath(new URL("..", import.meta.url));

const runSmokeFixture = async (routes, options = {}) => {
  const server = createServer(async (request, response) => {
    const route = routes[new URL(request.url, "http://fixture").pathname];
    if (!route) {
      response.writeHead(404);
      response.end();
      return;
    }
    await route(request, response);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, [smokeScriptPath], {
      cwd: frontendRoot,
      env: {
        ...process.env,
        SMOKE_BASE_URL: `http://127.0.0.1:${port}`,
        SMOKE_TIMEOUT_MS: "100",
        SMOKE_INTERVAL_MS: "5",
        SMOKE_REQUEST_TIMEOUT_MS: "1000",
        ...options,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("exit", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
  await new Promise((resolve) => server.close(resolve));
  return result;
};

const json = (payload, status = 200) => (_request, response) => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
};

const publicRoutes = (catalog = { data: [] }) => ({
  "/login": json({ ok: true }),
  "/api/card-catalog/providers": json(catalog),
});

test("deployment smoke test keeps backend readiness checks explicitly opt-in", () => {
  assert.match(smokeScript, /SMOKE_BACKEND_BASE_URL/);
  assert.match(smokeScript, /expectJson\("\/health", "backend health", backendBaseUrl\)/);
  assert.match(smokeScript, /expectJson\("\/ready", "backend readiness", backendBaseUrl\)/);
  assert.match(smokeScript, /readiness\.status !== "ready"/);
});

test("public smoke passes with an intentionally empty catalog", async () => {
  const result = await runSmokeFixture(publicRoutes());

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /public reachability\/catalog smoke test completed/);
});

test("public smoke exercises detail and image checks for a non-empty catalog", async () => {
  const result = await runSmokeFixture({
    ...publicRoutes({ data: [{ products: [{ presetId: "fixture-card", imageUrl: "/card-images/fixture.svg" }] }] }),
    "/api/card-catalog/products/fixture-card": json({ data: { presetId: "fixture-card" } }),
    "/card-images/fixture.svg": (_request, response) => {
      response.writeHead(200, { "content-type": "image/svg+xml" });
      response.end("<svg/>");
    },
  });

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /catalog product detail returned HTTP 200/);
  assert.match(result.stdout, /card image content-type is image\/svg\+xml/);
});

test("public smoke rejects redirects, malformed JSON and HTTP errors", async (t) => {
  await t.test("redirect", async () => {
    const result = await runSmokeFixture({
      ...publicRoutes(),
      "/login": (_request, response) => {
        response.writeHead(307, { location: "/login?next=%2Fcards" });
        response.end();
      },
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /public login returned HTTP 307/);
  });

  await t.test("malformed JSON", async () => {
    const result = await runSmokeFixture({
      "/login": json({ ok: true }),
      "/api/card-catalog/providers": (_request, response) => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end("not-json");
      },
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /catalog providers did not return JSON/);
  });

  await t.test("HTTP error", async () => {
    const result = await runSmokeFixture({
      "/login": json({ ok: true }),
      "/api/card-catalog/providers": json({ error: { code: "DOWN" } }, 503),
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /catalog providers returned HTTP 503/);
  });

  await t.test("timeout", async () => {
    const result = await runSmokeFixture({
      "/login": () => {},
    }, { SMOKE_REQUEST_TIMEOUT_MS: "50" });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /public login request failed/);
  });
});

test("public smoke remains read-only and does not probe protected business APIs", () => {
  assert.doesNotMatch(smokeScript, /\/api\/cards/);
  assert.doesNotMatch(smokeScript, /\/api\/financial-reports\/summary/);
  assert.doesNotMatch(smokeScript, /method:\s*["'](?:POST|PUT|PATCH|DELETE)/);
});
