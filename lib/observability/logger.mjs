const redactValue = (value) => {
  if (typeof value !== "string") return value;
  if (/mongodb(?:\+srv)?:\/\//i.test(value)) return "[redacted]";
  if (/password|secret|token|uri|connection/i.test(value)) return "[redacted]";
  return value;
};

const sanitizeContext = (context = {}) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(context)) {
    if (/password|secret|token|uri|connection|string/i.test(key)) {
      sanitized[key] = "[redacted]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeContext(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(redactValue);
    } else {
      sanitized[key] = redactValue(value);
    }
  }

  return sanitized;
};

export const logEvent = (level, event, context = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    context: sanitizeContext(context),
  };
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
};

export const logInfo = (event, context) => logEvent("info", event, context);
export const logWarn = (event, context) => logEvent("warn", event, context);
export const logError = (event, context) => logEvent("error", event, context);

export const errorContext = (error) => ({
  errorName: error instanceof Error ? error.name : typeof error,
  errorMessage: error instanceof Error ? error.message : String(error),
  ...(error && typeof error === "object" && "code" in error ? { errorCode: error.code } : {}),
  ...(error && typeof error === "object" && "status" in error ? { status: error.status } : {}),
});
