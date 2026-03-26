import pino from "pino";

const prodConfiguration = () =>
  pino.transport({
    targets: [
      {
        target: "pino/file",
        options: { destination: 1 }, // fd 1 is stdout
        level: process.env.LOG_LEVEL || "trace",
      },
    ],
  });

// we want nicer looking logs for dev purposes; make this
// a function so that the transport() method is ONLY called
// if we actually want this config
const devConfiguration = () =>
  pino.transport({
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    targets: [
      {
        target: "pino-pretty",
        options: {
          colorize: true,
          sync: true
         },
        level: process.env.LOG_LEVEL || "trace",
        minimumLevel: process.env.LOG_LEVEL || "trace",
      },
    ],
  });

export const logger = pino(
  // pino can set levels globally or per-transport target. let's be explicit
  // about setting levels globally, since for dev purposes we want trace logs
  {
    level: process.env.LOG_LEVEL || "trace",
  },
  process.env.API_PROXY_PRODUCTION ? prodConfiguration() : devConfiguration(),
);

export default logger;
