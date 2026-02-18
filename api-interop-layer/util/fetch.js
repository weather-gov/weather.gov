import { createLogger } from "./monitoring/index.js";
import { sleep } from "./sleep.js";

const logger = createLogger("fetch wrapper");

const BASE_URL = process.env.API_URL ?? "https://api.weather.gov";

// Only allow paths that are simple relative references starting with a
// forward slash. The old code used URL.canParse(path) and forwarded
// fully-qualified URLs verbatim, which meant an attacker-controlled value
// like "https://evil.com/data" would cause the server to reach out to
// that host directly — a classic Server-Side Request Forgery opening.
//
// Blocking just "://" is not sufficient on its own, because the URL
// constructor also resolves protocol-relative paths ("//evil.com/path")
// against the base URL's scheme, resulting in a request to evil.com.
// Similarly, "data:" or "javascript:" URIs pass the "://" check but
// resolve to unexpected targets. Requiring a leading single "/" and
// nothing else catches all of these edge cases in one shot.
const internalFetch = async (path) => {
  if (!path.startsWith("/") || path.startsWith("//")) {
    logger.error(`Blocked non-relative path: ${path}`);
    return { error: true, message: "Only relative paths are permitted" };
  }
  const url = new URL(path, BASE_URL).toString();
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
        logger.error(
          `error retrieving ${path}: endpoint returned invalid JSON: ${e}`,
        );
      } else {
        logger.error(`error retrieving ${path}: ${e.cause}`);
      }
      return { ...e.cause, error: true };
    });

export default { fetchAPIJson };
