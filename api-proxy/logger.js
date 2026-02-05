import pino from "pino";

const transport = pino.transport({
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  // api-proxy will always be for dev purposes.
  // so, log trace and above to stdout (fd 1)
  targets: [
    {
      target: "pino-pretty",
      options: { colorize: true },
      level: process.env.LOG_LEVEL || "trace",
    },
  ],
});

const logger = pino(
  {
    level: process.env.LOG_LEVEL || "trace",
  },
  transport,
);

export default logger;
