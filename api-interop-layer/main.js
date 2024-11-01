import fastify from "fastify";
import newrelic from "newrelic";
import { getDataForPoint, getAFDById } from "./data/index.js";
import { rest as alertsRest } from "./data/alerts/kinds.js";
import { createLogger } from "./util/monitoring/index.js";
import { startAlertProcessing } from "./data/alerts/index.js";

const main = async () => {
  const port = process.env.PORT || 8082;
  const server = fastify();
  const logger = createLogger("main");

  server.setErrorHandler((err, request, reply) => {
    logger.error(err);
    reply.status(500).send({ error: true });
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception");
    logger.error(err);
  });

  server.get("/", (_, response) => {
    response.send({ ok: true });
  });

  /**
   * Main point forecast route
   */
  server.route({
    method: "GET",
    url: "/point/:latitude/:longitude",
    schema: {
      params: {
        latitude: {
          type: "number",
          minimum: -90,
          maximum: 90,
        },
        longitude: {
          type: "number",
          minimum: -180,
          maximum: 180,
        },
      },
    },
    handler: async (request, response) => {
      logger.verbose(request.url);

      const { latitude, longitude } = request.params;
      performance.clearResourceTimings();
      const timer = performance.now();
      const data = await getDataForPoint(latitude, longitude);
      const end = performance.now() - timer;

      const apiTimings = performance
        .getEntriesByType("resource")
        .filter(({ initiatorType }) => initiatorType === "fetch")
        .reduce(
          (all, { name, duration }) => ({ ...all, [name]: duration }),
          {},
        );

      if (data.error) {
        // track this error in New Relic
        newrelic.recordLogEvent({
          message: request.url,
          level: "error",
          error: data.error,
        });

        // If there is a top-level error, set the status code accordingly.
        if (data.status) {
          response.code(data.status);
        }
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

  /**
   * AFD get by id route
   */
  server.route({
    method: "GET",
    url: "/products/:id",
    handler: async (request, response) => {
      logger.verbose(request.url);
      const id = request.params.id;

      performance.clearResourceTimings();
      const timer = performance.now();
      const data = await getAFDById(id);
      const end = performance.now() - timer;

      const apiTimings = performance
        .getEntriesByType("resource")
        .filter(({ initiatorType }) => initiatorType === "fetch")
        .reduce(
          (all, { name, duration }) => ({ ...all, [name]: duration }),
          {},
        );

      if (data.error) {
        // track this error in New Relic
        newrelic.recordLogEvent({
          message: request.url,
          level: "error",
          error: data.error,
        });

        // If there is a top-level error, set the status code accordingly.
        if (data.status) {
          response.code(data.status);
        }
      }

      response.send({
        ...data,
        "@metadata": {
          timing: { e2e: end, api: apiTimings },
          size: JSON.stringify(data).length,
        },
      });
    }
  });

  server.get("/meta/alerts", (_, response) => {
    response.send(alertsRest());
  });

  startAlertProcessing();

  await server.listen({ port, host: "0.0.0.0" });
  logger.info(`Listening on ${port}`);
};

main();
