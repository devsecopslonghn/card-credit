import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

test("MCP financial summary accepts ISO calendar dates", () => {
  const schema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });
  assert.deepEqual(schema.parse({ from: "2026-08-01", to: "2026-08-31" }), {
    from: "2026-08-01",
    to: "2026-08-31",
  });
});
