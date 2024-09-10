import { createLogger } from "./monitoring/index.js";
import { sleep } from "./sleep.js";

const logger = createLogger("fetch wrapper");

const BASE_URL = process.env.API_URL ?? "https://api.weather.gov";

const internalFetch = async (path) => {
  logger.verbose(`making API request to ${path}`);
  return fetch(`${BASE_URL}${path}`).then((r) => {
    logger.verbose(`success from ${path}`);
    return r.json();
  });
};

export const fetchAPIJson = async (path, { wait = sleep } = {}) =>
  internalFetch(path)
    .catch(() => wait(75).then(() => internalFetch(path)))
    .catch(() => wait(124).then(() => internalFetch(path)))
    .catch(() => wait(204).then(() => internalFetch(path)))
    .catch(() => wait(337).then(() => internalFetch(path)))
    .catch((e) => {
      logger.error(e);
      throw e;
    });

export default { fetchAPIJson };
