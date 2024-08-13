import fastify from "fastify";
import { getDataForPoint } from "./data/index.js";

const main = async () => {
  const port = process.env.PORT || 8082;
  const server = fastify();

  server.get("/", (request, response) => {
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
        "@metadata": { timing: { e2e: end, api: apiTimings } },
      });
    },
  });

  await server.listen({ port, host: "0.0.0.0" });
  console.log(`Listening on ${port}`);
};

main();
