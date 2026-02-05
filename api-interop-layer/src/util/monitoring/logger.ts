import pino from "pino";

const prodConfiguration = pino.transport({
  targets: [
    {
      target: "pino/file",
      options: { destination: 1 }, // fd 1 is stdout
      level: process.env.LOG_LEVEL || "info",
    },
  ],
});

// we want nicer looking logs for dev purposes
const devConfiguration = pino.transport({
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  targets: [
    {
      target: "pino-pretty",
      options: { colorize: true },
      level: process.env.LOG_LEVEL || "trace",
      // @ts-ignore - minimumLevel is not in the type definition but works
      minimumLevel: process.env.LOG_LEVEL || "trace",
      sync: true,
    },
  ],
});

export const logger = pino(
  // pino can set levels globally or per-transport target. let's be explicit
  // about setting levels globally, since for dev purposes we want trace logs
  {
    level:
      process.env.LOG_LEVEL ||
      (process.env.API_INTEROP_PRODUCTION ? "info" : "trace"),
  },
  process.env.API_INTEROP_PRODUCTION ? prodConfiguration : devConfiguration,
);

export default { logger };
