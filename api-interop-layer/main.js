import fastify from "fastify";
import newrelic from "newrelic";
import { getDataForPoint, getProductById } from "./data/index.js";
import { rest as alertsRest } from "./data/alerts/kinds.js";
import { createLogger } from "./util/monitoring/index.js";
import { startAlertProcessing } from "./data/alerts/index.js";
import { getGHWOForWFOAndCounty } from "./data/ghwo.js";

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
    // explicitly crash.
    process.exit(1);
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
   * Product get by id route
   */
  server.route({
    method: "GET",
    url: "/products/:id",
    handler: async (request, response) => {
      logger.verbose(request.url);
      const id = request.params.id;

      performance.clearResourceTimings();
      const timer = performance.now();
      const data = await getProductById(id);
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

  server.get("/meta/alerts", (_, response) => {
    response.send(alertsRest());
  });

  server.route({
    method: "GET",
    url: "/ghwo/:wfo/:county",
    schema: {
      params: {
        wfo: {
          type: "string",
          pattern: "^[A-Za-z]{3}$",
        },
        county: {
          type: "string",
          pattern: "^[0-9]{5}$",
        },
      },
    },
    handler: async (request, response) => {
      logger.verbose(request.url);

      performance.clearResourceTimings();
      const timer = performance.now();

      const { wfo, county } = request.params;

      const ghwo = await getGHWOForWFOAndCounty(wfo, county);

      const end = performance.now() - timer;

      if (ghwo.error) {
        response.status(ghwo.status ?? 500);
        response.send({ error: ghwo.error });

        newrelic.recordLogEvent({
          message: request.url,
          level: "error",
          error: `Error: ${ghwo.error}`,
        });

        return;
      }

      response.send({
        data: ghwo.data,
        "@metadata": {
          timing: { e2e: end },
          size: JSON.stringify(ghwo.data).length,
        },
      });
    },
  });

  startAlertProcessing();

  await server.listen({ port, host: "0.0.0.0" });
  logger.info(`Listening on ${port}`);
};

main();
