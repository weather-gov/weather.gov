import fastify from "fastify";
import { getDataForPoint } from "./data/index.js";
import { rest as alertsRest } from "./data/alerts/kinds.js";
import { createLogger } from "./util/monitoring/index.js";

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

  await server.listen({ port, host: "0.0.0.0" });
  logger.info(`Listening on ${port}`);
};

main();
