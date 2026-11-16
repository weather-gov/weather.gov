import pino from "pino";

// match python's logging level names
const LEVEL_NAMES = {
  trace: "TRACE",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
};

// if we get WARNING or CRITICAL then we want to convert to the pino equivalent.
// note that pino will throw an error if it doesn't recognize the level.
export const apiLogLevel = (name = "info") => {
  const level = name.toLowerCase();
  return { warning: "warn", critical: "fatal" }[level] ?? level;
};

export const logger = pino(
  {
    base: { service: "api-interop-layer" },
    messageKey: "message",
    formatters: {
      level(label) {
        return {
          levelname: LEVEL_NAMES[label] ?? label.toUpperCase(),
        };
      },
    },
    level: apiLogLevel(process.env.LOG_LEVEL || "info"),
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  },
  process.stdout,
);

export default { logger };
