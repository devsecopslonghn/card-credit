import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./tools.js";
import type { ServiceContext } from "../services/types/service-context.js";

const authorized = (request: FastifyRequest, token: string) => {
  const supplied = request.headers.authorization?.startsWith("Bearer ") ? request.headers.authorization.slice(7) : "";
  return Boolean(token) && supplied.length === token.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
};

export const registerMcpHttp = (app: FastifyInstance, ctx: ServiceContext, token: string) => {
  app.post<{ Body: unknown }>("/mcp", async (request, reply) => {
    if (!authorized(request, token)) return reply.code(401).header("WWW-Authenticate", "Bearer").send({ error: "MCP_UNAUTHORIZED" });
    reply.hijack();
    const server = createMcpServer(ctx);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(request.raw, reply.raw, request.body);
  });
};
