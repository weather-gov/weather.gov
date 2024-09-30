import { createLogger } from "./monitoring/index.js";
import { sleep } from "./sleep.js";

const logger = createLogger("fetch wrapper");

const BASE_URL = process.env.API_PROXY_URL ?? "https://api.weather.gov";

const internalFetch = async (path) => {
  const url = URL.canParse(path) ? path : new URL(path, BASE_URL).toString();
  logger.verbose(`making request to ${url}`);

  return fetch(url).then(async (r) => {
    if (r.status >= 200 && r.status < 400) {
      logger.verbose(`success from ${path}`);
      return r.json();
    }

    const response = await r.json();
    logger.error(`non-success on ${path}`);
    logger.error(response);

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
          logger.error(`error retrieving ${path}: endpoint returned invalid JSON: ${e}`);
      } else {
          logger.error(`error retrieving ${path}: ${e.cause}`);
      }
      return { ...e.cause, error: true };
    });

export default { fetchAPIJson };
