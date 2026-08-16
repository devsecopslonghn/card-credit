import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");

test("backend image installs linked shared runtime dependencies in build and runner stages", () => {
  assert.equal((dockerfile.match(/npm --prefix \/shared ci --omit=dev/g) ?? []).length, 2);
  assert.match(dockerfile, /COPY --from=deps \/shared \/shared/);
  assert.match(dockerfile, /FROM node:22-alpine AS runner[\s\S]*?COPY shared\/package\.json shared\/package-lock\.json \/shared\/[\s\S]*?npm --prefix \/shared ci --omit=dev[\s\S]*?COPY shared \/shared/);
});
