import { createLogger } from "./monitoring/index.js";
import { sleep } from "./sleep.js";

const logger = createLogger("fetch wrapper");

const BASE_URL = process.env.API_URL ?? "https://api.weather.gov";
const BASE_GHWO_URL = process.env.GHWO_URL ?? "https://www.weather.gov";
const STANDARD_HEADERS = process.env.API_KEY
  ? { "API-Key": process.env.API_KEY }
  : {};

const internalFetch = async (path) => {
  let url = URL.canParse(path)
    ? URL.parse(path)
    : new URL(path, BASE_URL).toString();

  const headers = { ...STANDARD_HEADERS };

  // If the hostname is specified in the original request, preserve that as
  // a special header. In dev environments, our magic proxy will pick this up
  // to use for routing.
  if (url.hostname) {
    headers["wx-host"] = url.hostname;
  }

  if (
    url.hostname === "www.weather.gov" &&
    url.pathname.startsWith("/source/")
  ) {
    // If the incoming path matches a request to the website's risk overview
    // endpoint, switch to the GHWO base URL.
    url = new URL(url.pathname, BASE_GHWO_URL);
  }
  logger.verbose(`making request to ${url}`);

  return fetch(url, { headers }).then(async (r) => {
    // If there are headers, get the correlation ID. There may not be one, but
    // that's beside the point. We'll attach the correlation ID to downstream
    // log messages about the success/failure of this response.
    const correlationID = r.headers?.get("x-correlation-id");

    if (r.status >= 200 && r.status < 400) {
      logger.verbose({
        message: `success from ${path}`,
        "api-correlation-id": correlationID,
      });
      return r.json();
    }

    const response = await r.json();
    logger.error(
      { message: `non-success (HTTP ${r.status}) on ${path}`, correlationID },
      response,
    );

    // If there was a server error, retry. These are often temporary.
    if (r.status >= 500) {
      const error = new Error();
      error.cause = { ...response, status: r.status };
      return Promise.reject(error);
    }

    // For request errors, don't retry. They're not likely to resolve on their
    // own so there's no point.
    return { status: r.status, ...response, error: true };
  });
};

export const fetchAPIJson = async (path, { wait = sleep } = {}) =>
  internalFetch(path)
    .catch(() => wait(75).then(() => internalFetch(path)))
    .catch(() => wait(124).then(() => internalFetch(path)))
    .catch(() => wait(204).then(() => internalFetch(path)))
    .catch(() => wait(337).then(() => internalFetch(path)))
    .catch((e) => {
      if (e instanceof SyntaxError) {
        // this can happen if the API or proxy returns HTML
        logger.error(`error retrieving ${path} due to invalid JSON`, e);
      } else {
        logger.error(`error retrieving ${path}`, e.cause);
      }
      return { ...e.cause, error: true };
    });

export { fetchAPIJson as default, BASE_URL };
