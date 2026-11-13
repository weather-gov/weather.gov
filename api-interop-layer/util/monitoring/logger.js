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
    level: process.env.LOG_LEVEL || "info",
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  },
  process.stdout,
);

export default { logger };
