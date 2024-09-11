import { createLogger } from "./monitoring/index.js";
import { sleep } from "./sleep.js";

const logger = createLogger("fetch wrapper");

const BASE_URL = process.env.API_URL ?? "https://api.weather.gov";

const internalFetch = async (path) => {
  const url = URL.canParse(path) ? path : `${BASE_URL}/${path}`;
  logger.verbose(`making request to ${url}`);

  return fetch(url).then(async (r) => {
    if (r.status >= 200 && r.status < 400) {
      logger.verbose(`success from ${path}`);
      return r.json();
    }

    const response = await r.json();
    logger.error(`non-success on ${path}`);
    logger.error(response);

    return { error: true, ...response };
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
