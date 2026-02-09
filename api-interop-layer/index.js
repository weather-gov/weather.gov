import fastify from "fastify";
import { startAlertProcessing } from "./data/alerts/index.js";
import routes from "./routes/index.js";
import { logger } from "./util/monitoring/index.js";

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

        const { data, error, status } = await handler(request);

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
