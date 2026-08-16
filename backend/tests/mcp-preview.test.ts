import test from "node:test";
import assert from "node:assert/strict";
import { createPreviewTokenCodec, MCP_PREVIEW_TTL_MS } from "../src/mcp/preview.js";

const secret = "01234567890123456789012345678901";
const binding = { workspaceId: "workspace-a", userId: "user-a", channel: "mcp" } as const;

test("preview token canonicalizes payloads and binds operation/context without raw payload", () => {
  let now = 1_700_000_000_000;
  const codec = createPreviewTokenCodec({ secret, now: () => now });
  const first = codec.issue("create_account", { nested: { b: 2, a: 1 }, note: "secret-note" }, binding);
  assert.equal(first.expiresAt - now, MCP_PREVIEW_TTL_MS);
  assert.equal(first.expiresInSeconds, 300);
  assert.equal(first.confirmationToken.includes("secret-note"), false);
  assert.doesNotThrow(() => codec.verify(first.confirmationToken, "create_account", { note: "secret-note", nested: { a: 1, b: 2 } }, binding));
  assert.throws(() => codec.verify(first.confirmationToken, "create_account", { note: "secret-note", nested: { a: 1, b: 3 } }, binding), /mismatched|Invalid/);
  assert.throws(() => codec.verify(first.confirmationToken, "create_account", { note: "secret-note", nested: { a: 1, b: 2 } }, { ...binding, workspaceId: "workspace-b" }), /mismatched|Invalid/);
  assert.throws(() => codec.verify(first.confirmationToken, "other", { note: "secret-note", nested: { a: 1, b: 2 } }, binding), /mismatched|Invalid/);
  now += MCP_PREVIEW_TTL_MS;
  assert.throws(() => codec.verify(first.confirmationToken, "create_account", { note: "secret-note", nested: { a: 1, b: 2 } }, binding), /mismatched|Expired/);
});

test("preview token rejects unsupported payloads, malformed tokens and weak secrets", () => {
  assert.throws(() => createPreviewTokenCodec({ secret: "short" }), /at least 32/);
  const codec = createPreviewTokenCodec({ secret });
  assert.throws(() => codec.issue("op", { value: undefined }, binding), /Invalid preview payload/);
  assert.throws(() => codec.issue("op", { value: Number.NaN }, binding), /Invalid preview payload/);
  const token = codec.issue("op", { value: 1 }, binding).confirmationToken;
  assert.throws(() => codec.verify(`${token}.extra`, "op", { value: 1 }, binding), /Invalid confirmation token/);
  assert.throws(() => codec.verify(`${token.slice(0, -1)}x`, "op", { value: 1 }, binding), /Invalid confirmation token/);
});
