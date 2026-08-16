import crypto from "node:crypto";
import { canonicalPayloadHash } from "../command-hash.js";
export { canonicalPayloadHash } from "../command-hash.js";

export const MCP_PREVIEW_TTL_MS = 300_000;
export const MCP_PREVIEW_TTL_SECONDS = MCP_PREVIEW_TTL_MS / 1000;
const PREVIEW_SCHEMA_VERSION = "preview.v1";

export type PreviewBinding = { workspaceId: string; userId: string; channel: string };
type PreviewClaims = { version: string; operation: string; payloadHash: string; contextHash: string; issuedAt: number; expiresAt: number };

const normalizedBinding = (binding: PreviewBinding): PreviewBinding => {
  const value = { workspaceId: binding.workspaceId?.trim(), userId: binding.userId?.trim(), channel: binding.channel?.trim() };
  if (Object.values(value).some((item) => !item)) throw new Error("Invalid preview context");
  return value;
};
const previewPayloadHash = (payload: unknown) => {
  try { return canonicalPayloadHash(payload); } catch { throw new Error("Invalid preview payload"); }
};
const contextHash = (binding: PreviewBinding) => canonicalPayloadHash(normalizedBinding(binding));
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const safeEqual = (left: string, right: string) => { const a = Buffer.from(left, "utf8"); const b = Buffer.from(right, "utf8"); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const sign = (secret: string, body: string) => crypto.createHmac("sha256", secret).update(`card-credit:mcp-preview:v1:${body}`).digest("base64url");

export type PreviewTokenCodec = {
  ttlSeconds: number;
  issue(operation: string, payload: unknown, binding: PreviewBinding): { confirmationToken: string; expiresAt: number; expiresInSeconds: number };
  verify(token: string, operation: string, payload: unknown, binding: PreviewBinding): void;
};

export const createPreviewTokenCodec = (options: { secret: string; now?: () => number; ttlMs?: number }): PreviewTokenCodec => {
  const secret = options.secret.trim();
  if (secret.length < 32) throw new Error("MCP_PREVIEW_SECRET must contain at least 32 characters");
  const ttlMs = options.ttlMs ?? MCP_PREVIEW_TTL_MS;
  if (!Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 1_800_000) throw new Error("Preview TTL must be between 1000 and 1800000 milliseconds");
  const now = options.now ?? Date.now;
  return {
    ttlSeconds: Math.floor(ttlMs / 1000),
    issue(operation, payload, binding) {
      const issuedAt = now();
      const claims: PreviewClaims = { version: PREVIEW_SCHEMA_VERSION, operation: operation.trim(), payloadHash: previewPayloadHash(payload), contextHash: contextHash(binding), issuedAt, expiresAt: issuedAt + ttlMs };
      const body = encode(claims);
      return { confirmationToken: `${body}.${sign(secret, body)}`, expiresAt: claims.expiresAt, expiresInSeconds: Math.floor(ttlMs / 1000) };
    },
    verify(token, operation, payload, binding) {
      const [body, providedSignature, ...extra] = token.split(".");
      if (!body || !providedSignature || extra.length || !safeEqual(providedSignature, sign(secret, body))) throw new Error("Invalid confirmation token");
      let claims: PreviewClaims;
      try { claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PreviewClaims; } catch { throw new Error("Invalid confirmation token"); }
      const current = now();
      if (claims.version !== PREVIEW_SCHEMA_VERSION || claims.operation !== operation.trim() || !Number.isFinite(claims.issuedAt) || !Number.isFinite(claims.expiresAt) || claims.issuedAt > current + 60_000 || claims.expiresAt <= current || claims.expiresAt - claims.issuedAt !== ttlMs || !safeEqual(claims.payloadHash, previewPayloadHash(payload)) || !safeEqual(claims.contextHash, contextHash(binding))) throw new Error("Expired or mismatched confirmation token");
    },
  };
};

const environmentCodec = () => createPreviewTokenCodec({ secret: process.env.MCP_PREVIEW_SECRET?.trim() ?? "" });
export const createPreviewToken = (operation: string, payload: unknown, binding: PreviewBinding) => environmentCodec().issue(operation, payload, binding);
export const verifyPreviewToken = (token: string, operation: string, payload: unknown, binding: PreviewBinding) => environmentCodec().verify(token, operation, payload, binding);
/** @deprecated Use verifyPreviewToken; stateless tokens remain replayable until expiry. */
export const consumePreviewToken = verifyPreviewToken;
