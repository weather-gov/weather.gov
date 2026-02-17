import fastify from "fastify";
import fs from "fs";
import inspector from "inspector";
import { startAlertProcessing } from "./data/alerts/index.js";
import routes from "./routes/index.js";
import { logger } from "./util/monitoring/index.js";
import { atMaxNumConnections, MAX_OPEN_CONNECTIONS } from "./util/fetch.js";

const REQUIRED_ENV_VARS = ["API_URL", "GHWO_URL"];

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

// Start profiling with `kill -USR1 <node process id>`
process.on('SIGUSR1', async () => {
  if (profiling) return;

  profiling = true;
  session = new inspector.Session();
  session.connect();

  await new Promise(resolve => {
    session.post('Profiler.enable', () => {
      session.post('Profiler.start', resolve);
      logger.info("CPU profiling is now on, send SIGUSR2 to turn off");
    });
  });
});

// Stop profiling with `kill -USR2 <node process id>`
process.on('SIGUSR2', async () => {
  if (!profiling) return;

  session.post('Profiler.stop', (err, { profile }) => {
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
        logger.trace({ url: request.url });

        /**
         * Check first to see if we are at the max open
         * connections threshold. If so, immediately
         * respond with a 429
         */
        let data, error, status;
        if(atMaxNumConnections()){
          data = {
            "message": `Exceeded max connections`,
            "maxConnections": MAX_OPEN_CONNECTIONS
          };
          error = true;
          status = 429;
        } else {
          ({ data, error, status } = await handler(request));
        }

        if (error) {
          logger.error({ err: error });
        }

        if (status) {
          logger.trace({ url: request.url, status });
          response.code(status);
        }

        response.send(data);
      },
    });
  });

  startAlertProcessing();

  await server.listen({ port, host: "0.0.0.0" });
  logger.info({ port }, "listening");
};
