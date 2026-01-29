import pino from "pino";

const transport = pino.transport({
  targets: [
    // api-proxy will always be for dev purposes.
    // so, log trace and above to stdout (fd 1)
    {
      level: process.env.LOG_LEVEL || "trace",
      target: "pino/file",
      options: { destination: 1 },
    },
  ],
});

const logger = pino(transport);

export default logger;
