import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/register/page.tsx", import.meta.url), "utf8");

test("registration does not expose or submit a client-selected workspace", () => {
  assert.doesNotMatch(page, /workspaceId/);
  assert.match(page, /email,/);
  assert.match(page, /password,/);
});
