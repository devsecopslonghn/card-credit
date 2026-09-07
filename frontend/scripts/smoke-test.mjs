#!/usr/bin/env node

const baseUrl = (process.env.SMOKE_BASE_URL ?? process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const backendBaseUrl = (process.env.SMOKE_BACKEND_BASE_URL ?? "").replace(/\/$/, "");
const requestTimeoutMs = Number(process.env.SMOKE_REQUEST_TIMEOUT_MS ?? 10_000);

const fail = (message, details) => {
  console.error(`[smoke] FAIL ${message}`);
  if (details) console.error(details);
  process.exit(1);
};

const pass = (message) => {
  console.log(`[smoke] PASS ${message}`);
};

const info = (message) => {
  console.log(`[smoke] INFO ${message}`);
};

const fetchWithTimeout = async (path, options = {}, targetBaseUrl = baseUrl) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs ?? requestTimeoutMs));
  try {
    return await fetch(`${targetBaseUrl}${path}`, {
      method: "GET",
      redirect: "manual",
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const expectOk = async (path, label = path, targetBaseUrl = baseUrl) => {
  let response;
  try {
    response = await fetchWithTimeout(path, {}, targetBaseUrl);
  } catch (error) {
    fail(`${label} request failed`, error instanceof Error ? error.message : String(error));
  }
  if (!response.ok) {
    fail(`${label} returned HTTP ${response.status}`, await response.text().catch(() => ""));
  }
  pass(`${label} returned HTTP ${response.status}`);
  return response;
};

const expectJson = async (path, label = path, targetBaseUrl = baseUrl) => {
  const response = await expectOk(path, label, targetBaseUrl);
  try {
    return await response.json();
  } catch (error) {
    fail(`${label} did not return JSON`, error instanceof Error ? error.message : String(error));
  }
};

if (backendBaseUrl) {
  const health = await expectJson("/health", "backend health", backendBaseUrl);
  if (health.status !== "ok") fail("backend health payload is invalid");

  const readiness = await expectJson("/ready", "backend readiness", backendBaseUrl);
  if (readiness.status !== "ready") fail("backend readiness payload is invalid");
}

await expectOk("/login", "public login");

const providersResponse = await expectJson("/api/card-catalog/providers", "catalog providers");
if (!Array.isArray(providersResponse.data)) {
  fail("catalog providers response data is not an array");
}
pass(`catalog providers returned ${providersResponse.data.length} provider(s)`);

const firstProduct = providersResponse.data.flatMap((provider) => provider.products ?? [])[0];
if (firstProduct?.presetId) {
  await expectJson(`/api/card-catalog/products/${encodeURIComponent(firstProduct.presetId)}`, "catalog product detail");

  const imagePath = firstProduct.imageUrl || "/card-images/placeholder-card.svg";
  const imageResponse = await expectOk(imagePath, "card image or placeholder");
  const contentType = imageResponse.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    fail("card image or placeholder did not return an image content-type", contentType);
  }
  pass(`card image content-type is ${contentType}`);
} else {
  info("catalog product detail and image checks skipped because the public catalog is empty");
}

console.log("[smoke] public reachability/catalog smoke test completed");
