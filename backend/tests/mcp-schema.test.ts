import assert from "node:assert/strict";
import test from "node:test";
import { reportDateRangeSchema } from "@card-credit/contracts";
import { mcpToolManifest } from "../src/mcp/manifest.js";

test("MCP financial summary accepts ISO calendar dates", () => {
  assert.deepEqual(reportDateRangeSchema.parse({ from: "2026-08-01", to: "2026-08-31" }), {
    from: "2026-08-01",
    to: "2026-08-31",
  });
  const definition = mcpToolManifest.find(({ name }) => name === "get_personal_finance_summary");
  assert.equal(definition?.inputSchema.from, reportDateRangeSchema.shape.from);
  assert.throws(() => reportDateRangeSchema.parse({ from: "2026-02-30", to: "2026-03-01" }));
  assert.throws(() => reportDateRangeSchema.parse({ from: "2026-09-01", to: "2026-08-31" }));
});
