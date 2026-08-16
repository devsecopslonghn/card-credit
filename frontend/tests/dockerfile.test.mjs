import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");

test("frontend image installs linked shared runtime dependencies in the clean build context", () => {
  assert.match(dockerfile, /COPY shared\/package\.json shared\/package-lock\.json \/workspace\/shared\//);
  assert.match(dockerfile, /npm --prefix \/workspace\/shared ci --omit=dev/);
  assert.match(dockerfile, /COPY --from=deps \/workspace\/shared \/workspace\/shared/);
});
