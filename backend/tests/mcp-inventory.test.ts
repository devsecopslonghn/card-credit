import assert from "node:assert/strict";
import test from "node:test";
import { MCP_TOOL_INVENTORY, mcpToolManifest } from "../src/mcp/manifest.js";
import { mcpToolNamesForDocs } from "../src/api-docs.js";
import { createMcpServer } from "../src/mcp/tools.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

test("MCP inventory is unique and exposes only registered tool names", () => {
  assert.equal(new Set(MCP_TOOL_INVENTORY).size, MCP_TOOL_INVENTORY.length);
  assert.deepEqual(MCP_TOOL_INVENTORY, mcpToolManifest.map(({ name }) => name));
  assert.equal(mcpToolManifest.filter(({ kind }) => kind === "preview").length, 3);
  assert.equal(mcpToolManifest.filter(({ kind }) => kind === "confirm").length, 3);
  for (const preview of mcpToolManifest.filter(({ kind }) => kind === "preview")) {
    assert.ok(preview.operation);
    assert.equal(mcpToolManifest.some((candidate) => candidate.kind === "confirm" && candidate.operation === preview.operation), true);
  }
  for (const definition of mcpToolManifest) {
    assert.ok(definition.description);
    assert.equal("userId" in definition.inputSchema, false);
    assert.equal("workspaceId" in definition.inputSchema, false);
    assert.equal("role" in definition.inputSchema, false);
  }
  assert.deepEqual(mcpToolNamesForDocs(), MCP_TOOL_INVENTORY);
});

test("MCP tools/list matches the canonical manifest", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "inventory-test", version: "1.0.0" });
  const server = createMcpServer({ workspaceId: "w1", userId: "u1", role: "user", channel: "mcp", correlationId: "test" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const result = await client.listTools();
  assert.deepEqual(result.tools.map(({ name }) => name), MCP_TOOL_INVENTORY);
  assert.equal(result.tools.length, mcpToolManifest.length);
  await client.close();
  await server.close();
});
