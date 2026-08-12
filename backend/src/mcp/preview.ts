import crypto from "node:crypto";

const secret = () => process.env.MCP_PREVIEW_SECRET?.trim() || process.env.AUTH_SECRET || "";
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
export const createPreviewToken = (operation: string, payload: unknown) => {
  const body = encode({ operation, payload, expiresAt: Date.now() + 30 * 60_000 });
  const signature = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
};
export const consumePreviewToken = (token: string, operation: string, payload: unknown) => {
  const [body, signature] = token.split(".");
  if (!body || !signature) throw new Error("Invalid confirmation token");
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Invalid confirmation token");
  const value = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { operation: string; payload: unknown; expiresAt: number };
  if (value.operation !== operation || value.expiresAt < Date.now() || JSON.stringify(value.payload) !== JSON.stringify(payload)) throw new Error("Expired or mismatched confirmation token");
};
