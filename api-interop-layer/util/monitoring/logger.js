import pino from "pino";

const transport = pino.transport({
  targets: [
    // log info and above to stdout (fd 1)
    {
      level: process.env.LOG_LEVEL || "info",
      target: "pino/file",
      options: { destination: 1 },
    },
  ],
});

export const logger = pino(transport);

export default { logger };
