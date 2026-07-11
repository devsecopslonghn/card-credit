#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_INTERVAL_MS = 2_000;

const baseUrl = (process.env.SMOKE_BASE_URL ?? process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
const intervalMs = Number(process.env.SMOKE_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
const startedAt = Date.now();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const fetchWithTimeout = async (path, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs ?? 10_000));
  try {
    return await fetch(`${baseUrl}${path}`, {
      method: "GET",
      redirect: "manual",
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const waitForHttpOk = async (path) => {
  let lastError = "";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchWithTimeout(path);
      if (response.ok || response.status === 307 || response.status === 308) return response;
      lastError = `${path} returned ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    info(`waiting for ${path}: ${lastError}`);
    await sleep(intervalMs);
  }

  fail(`${path} did not become healthy within ${timeoutMs}ms`, lastError);
};

const expectOk = async (path, label = path) => {
  const response = await fetchWithTimeout(path);
  if (!response.ok) {
    fail(`${label} returned HTTP ${response.status}`, await response.text().catch(() => ""));
  }
  pass(`${label} returned HTTP ${response.status}`);
  return response;
};

const expectJson = async (path, label = path) => {
  const response = await expectOk(path, label);
  try {
    return await response.json();
  } catch (error) {
    fail(`${label} did not return JSON`, error instanceof Error ? error.message : String(error));
  }
};

await waitForHttpOk("/cards");
pass("/cards is reachable");

const providersResponse = await expectJson("/api/card-catalog/providers", "catalog providers");
if (!Array.isArray(providersResponse.data) || providersResponse.data.length === 0) {
  fail("catalog providers returned no providers");
}
pass(`catalog providers returned ${providersResponse.data.length} provider(s)`);

const firstProduct = providersResponse.data.flatMap((provider) => provider.products ?? [])[0];
if (!firstProduct?.presetId) fail("catalog providers returned no active product for product detail smoke");

await expectJson(`/api/card-catalog/products/${encodeURIComponent(firstProduct.presetId)}`, "catalog product detail");

const imagePath = firstProduct.imageUrl || "/card-images/placeholder-card.svg";
const imageResponse = await expectOk(imagePath, "card image or placeholder");
const contentType = imageResponse.headers.get("content-type") ?? "";
if (!contentType.startsWith("image/")) {
  fail("card image or placeholder did not return an image content-type", contentType);
}
pass(`card image content-type is ${contentType}`);

const cards = await expectJson("/api/cards", "cards list");
if (!Array.isArray(cards)) fail("cards list response is not an array");
pass(`cards list returned ${cards.length} card(s), confirming database-backed read`);

if (cards.length > 0) {
  const cardId = cards[0]._id;
  if (!cardId) fail("first card has no _id for detail smoke");
  await expectJson(`/api/cards/${encodeURIComponent(cardId)}`, "card detail");
} else {
  info("card detail smoke skipped because cards list is empty");
}

const report = await expectJson("/api/reports/summary", "report summary");
if (!report || typeof report !== "object" || !("cards" in report) || !("totals" in report)) {
  fail("report summary shape is invalid");
}
pass("report summary returned cards and totals");

console.log("[smoke] deploy smoke test completed");
