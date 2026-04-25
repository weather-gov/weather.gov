import fastify from "fastify";
import fs from "fs";
import inspector from "inspector";
import { startAlertProcessing } from "./data/alerts/index.js";
import routes from "./routes/index.js";
import { logger } from "./util/monitoring/index.js";
import ConnectionTracker from "./ConnectionTracker.js";
import asyncStorage from "./async-storage.js";
import getTimer, { API_TIMINGS_METADATA, groupPointBatches } from "./util/performance.js";

const REQUIRED_ENV_VARS = ["API_URL", "GHWO_URL"];
const GOLANG_URL = process.env.GOLANG_URL || "http://api-interop-golang:8083";

// Add prefixes of endpoints that have been converted to Golang here
const ROUTES_IN_GO = [
  "/test-go-proxy",
  "/meta/alerts",
  "/county/",
  "/products/afd/versions",
  "/point/"
];

const ensureEnvironmentVariables = () => {
  const missing = [];
  logger.info("Checking for required environment variables...");
  REQUIRED_ENV_VARS.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  if (missing.length) {
    logger.error({ missing }, "required environment variables not found");
    process.exit(-1);
  }
};

let session = null;
let profiling = false;

/** Send a signal for any parts of the code that need to do cleanup, then wait 0.3 seconds. */
const handleExit = () => {
  process.emit("SHUTDOWN");
  setTimeout(() => process.exit(0), 300);
};

// Gracefully shutdown when user presses Ctrl-c
process.on("SIGINT", handleExit);

// Gracefully shutdown when system sends termination signal
process.on("SIGTERM", handleExit);

process.on("exit", handleExit);

// Start profiling with `kill -USR1 <node process id>`
process.on("SIGUSR1", async () => {
  if (profiling) return;

  profiling = true;
  session = new inspector.Session();
  session.connect();

  await new Promise((resolve) => {
    session.post("Profiler.enable", () => {
      session.post("Profiler.start", resolve);
      logger.info("CPU profiling is now on, send SIGUSR2 to turn off");
    });
  });
});

// Stop profiling with `kill -USR2 <node process id>`
process.on("SIGUSR2", async () => {
  if (!profiling) return;

  session.post("Profiler.stop", (err, { profile }) => {
    const filename = `CPU-${Date.now()}.cpuprofile`;
    fs.writeFileSync(filename, JSON.stringify(profile));

    session.disconnect();
    session = null;
    profiling = false;
    logger.info("CPU profiling is now off, data written to a .cpuprofile file");
  });
});

export const main = async () => {
  const port = process.env.PORT || 8082;
  const server = fastify();

  server.addHook("onClose", (_, done) => {
    process.emit("SHUTDOWN");
    setTimeout(() => done(), 300);
  });

  // Check that required environment
  // variables are set
  ensureEnvironmentVariables();

  server.setErrorHandler((err, _, reply) => {
    logger.error({ err }, "unhandled error");
    reply.status(500).send({ error: true });
  });

  process.on("uncaughtException", (err) => {
    logger.error({ err }, "uncaught exception");
    // explicitly crash.
    process.exit(1);
  });

  // Log out the information about our ConnectionTracker
  logger.warn(
    {
      maxConnections: ConnectionTracker.maxConnections,
      currentSize: ConnectionTracker.currentSize,
      atMax: ConnectionTracker.atMax,
    },
    `Starting the ConnectionTracker`,
  );

  server.get("/", (_, response) => {
    response.send({
      ok: true,
      index: process.env.CF_INSTANCE_INDEX || "standalone",
    });
  });

  routes.forEach(({ method, url, schema, handler }) => {
    server.route({
      method,
      url,
      schema,
      handler: async (request, response) => {
        const timer = getTimer("");
        if(API_TIMINGS_METADATA){
          timer.start();
        }
        logger.trace({ url: request.url });

        if (ROUTES_IN_GO.some(prefix => request.url.startsWith(prefix))) {
          const goUrl = `${GOLANG_URL}${request.url}`;
          logger.trace({ goUrl }, "Proxying to Go container");
          try {
            const resp = await fetch(goUrl);
            const data = await resp.json();
            response.code(resp.status).send(data);
          } catch (err) {
            logger.error({ err }, "Failed proxying to Go");
            response.code(502).send({ error: "Bad Gateway" });
          }
          return;
        }

        /**
         * Check if we are at our max open
         * or pending connections for undici Pools,
         * via the ConnectionTracker object.
         * If so, immediately return a 429
         */
        let data, error, status;
        let metadata = [];
        if (ConnectionTracker.atMax) {
          status = 429;
          data = {
            message: "Too many open connections to NWS services",
            maxConnections: ConnectionTracker.maxConnections,
          };
          error = true;
          logger.warn(
            {
              maxConnections: ConnectionTracker.maxConnections,
              currentSize: ConnectionTracker.currentSize,
            },
            `429: Exceeded maximum number of outbound connections`,
          );
        } else {
          // If the variable to record API timings metadata is true,
          // we run the handler inside of the async execution context.
          // Run the handler within the async execution context
          if (API_TIMINGS_METADATA) {
            ({ data, error, status } = await asyncStorage.run(
              metadata,
              async () => {
                const result = await handler(request);
                const store = asyncStorage.getStore();
                if (result.data) {
                  result.data["@metadata"] = {
                    url,
                    timings: store
                  };
                  if(url.startsWith("/point")){
                    const batchData = groupPointBatches(store);
                    result.data["@metadata"].batches = batchData.batches;
                    result.data["@metadata"].total = batchData.total;
                  }
                }

                return result;
              },
            ));
          } else {
            // Otherwise, we run the handler directly and get the result object
            ({ data, error, status } = await handler(request));
          }

        }

        if (error) {
          logger.error({ err: error });
        }

        if (status) {
          logger.trace({ url: request.url, status });
          response.code(status);
        }

        if(API_TIMINGS_METADATA){
          timer.end();
          if(data["@metadata"]){
            data["@metadata"].interopResponseTime = timer.timing;
          }
        }
        
        response.send(data);
      },
    });
  });

  startAlertProcessing();

  await server.listen({ port, host: "0.0.0.0" });
  logger.info({ port }, "listening");
};
