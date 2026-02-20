import config from "./config.js";
import { localData } from "./data.js";
import logger from "./logger.js";
import proxy from "./proxy.js";

const serveLogger = logger.child({ subsystem: "file service" });

export default async (request, response) => {
  // See if we have data for this URL. If not, proxy it.
  if (!localData.has(request.originalUrl)) {
    serveLogger.info(
      { path: request.originalUrl },
      "local file does not exist; proxying",
    );
    await proxy(request, response);
  } else {
    // Otherwise, serve that sucker.
    serveLogger.info({ path: request.originalUrl }, "serving local file");
    const output = localData.get(request.originalUrl);

    const delay = config.delay
      ? new Promise((resolve) => {
          serveLogger.trace(
            { path: request.originalUrl, delay: config.delay },
            "delaying response",
          );
          setTimeout(() => {
            serveLogger.trace(
              { path: request.originalUrl, delay: config.delay },
              "delay has elapsed",
            );
            resolve();
          }, config.delay);
        })
      : Promise.resolve();

    // If the bundle contains a `now` key, override any
    // configured value for the current time with the timestamp
    // present in the bundle
    if (output["@bundle"]?.now) {
      config.now = output["@bundle"].now;
    }

    if (output["@bundle"]?.status) {
      serveLogger.info(
        { status: output["@bundle"].status },
        "local file has response status",
      );
      response.writeHead(output["@bundle"].status);
      response.end();
      return;
    }

    await delay;

    response.writeHead(200, {
      server: "weather.gov dev proxy",
      "Content-Type": "application/geo+json",
      "access-control-allow-origin": "*",
      "access-control-expose-headers":
        "X-Correlation-Id, X-Request-Id, X-Server-Id",
    });
    response.write(JSON.stringify(output, null, 2));
    response.end();
    serveLogger.trace({ path: request.originalUrl }, "finished serving");
  }
};
