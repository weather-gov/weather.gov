import fastify from "fastify";
import newrelic from "newrelic";
import { createLogger } from "./util/monitoring/index.js";
import { startAlertProcessing } from "./data/alerts/index.js";
import routes from "./routes/index.js";

const REQUIRED_ENV_VARS = ["API_URL", "GHWO_URL"];

const ensureEnvironmentVariables = (logger) => {
  const missing = [];
  logger.info("Checking for required environment variables...");
  REQUIRED_ENV_VARS.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  if (missing.length) {
    const msg = `Missing required environment variables: ${missing.join(", ")}`;
    logger.error(msg);
    process.exit(-1);
  }
};

export const main = async () => {
  const port = process.env.PORT || 8082;
  const server = fastify();
  const logger = createLogger("main");

  // Check that required environment
  // variables are set
  ensureEnvironmentVariables(logger);

  server.setErrorHandler((err, _, reply) => {
    logger.error("Unhandled error", err);
    reply.status(500).send({ error: true });
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", err);
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
        logger.verbose(request.url);

        performance.clearResourceTimings();
        const timer = performance.now();

        const { data, error, status } = await handler(request);

        if (error) {
          logger.error(`error on ${request.url}`, error);
        }

        const apiTimings = performance
          .getEntriesByType("resource")
          .filter(({ initiatorType }) => initiatorType === "fetch")
          .reduce(
            (all, { name, duration }) => ({ ...all, [name]: duration }),
            {},
          );

        const end = performance.now() - timer;

        if (status) {
          logger.verbose(`${request.url} status: ${status}`);
          response.code(status);
        }

        response.send({
          ...data,
          "@metadata": {
            timing: { e2e: end, api: apiTimings },
            size: JSON.stringify(data).length,
          },
        });
      },
    });
  });

  startAlertProcessing();

  await server.listen({ port, host: "0.0.0.0" });
  logger.info(`Listening on ${port}`);
};
