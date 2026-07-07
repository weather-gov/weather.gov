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

const transport = pino.transport({
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  targets: [
    {
      target: "pino/file",
      options: { destination: 1 }, // fd 1 is stdout
      level: process.env.LOG_LEVEL || "info",
    },
  ],
});

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
  },
  transport,
);

export default { logger };
