export type BackendConfig = {
  host: string;
  port: number;
  mongodbUri: string;
  authSecret: string;
  logLevel: string;
  shutdownTimeoutMs: number;
  bootstrapToken?: string;
  configuredUsers: Array<Record<string, unknown>>;
  returnResetToken: boolean;
};

const required = (env: NodeJS.ProcessEnv, name: string) => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const integer = (value: string | undefined, fallback: number, name: string) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be a positive integer no greater than 65535`);
  }
  return parsed;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): BackendConfig => {
  const authSecret = required(env, "AUTH_SECRET");
  if (authSecret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");

  let configuredUsers: Array<Record<string, unknown>> = [];
  if (env.AUTH_USERS_JSON?.trim()) {
    const parsed = JSON.parse(env.AUTH_USERS_JSON) as unknown;
    if (!Array.isArray(parsed)) throw new Error("AUTH_USERS_JSON must be an array");
    configuredUsers = parsed as Array<Record<string, unknown>>;
  }
  return {
    host: env.BACKEND_HOST?.trim() || "0.0.0.0",
    port: integer(env.BACKEND_PORT, 3001, "BACKEND_PORT"),
    mongodbUri: required(env, "MONGODB_URI"),
    authSecret,
    logLevel: env.LOG_LEVEL?.trim() || "info",
    shutdownTimeoutMs: integer(env.SHUTDOWN_TIMEOUT_MS, 10000, "SHUTDOWN_TIMEOUT_MS"),
    bootstrapToken: env.AUTH_BOOTSTRAP_TOKEN?.trim() || undefined,
    configuredUsers,
    returnResetToken: env.PASSWORD_RESET_RETURN_TOKEN === "true",
  };
};
