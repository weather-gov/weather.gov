import config from "./config.js";
import { logger } from "./logger.js";

const errorLogger = logger.child({ subsystem: "error service" });

export default async (request, response) => {
  const delay = config.delay
    ? new Promise((resolve) => {
        errorLogger.trace(
          { path: request.originalUrl, delay: config.delay },
          "delaying response",
        );
        setTimeout(() => {
          errorLogger.trace(
            { path: request.originalUrl, delay: config.delay },
            "delay has elapsed",
          );
          resolve();
        }, config.delay);
      })
    : Promise.resolve();

  await delay;

  response.writeHead(config.playError, {
    server: "weather.gov dev proxy",
    "Content-Type": "application/geo+json",
  });
  response.write(JSON.stringify({ error: config.playError }, null, 2));
  response.end();
  errorLogger.trace({ path: request.originalUrl }, "finished sending errors");
};
