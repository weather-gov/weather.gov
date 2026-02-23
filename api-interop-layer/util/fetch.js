import undici from "undici";
import {
  getFromRedis,
  getTTLFromResponse,
  saveToRedis,
  USE_REDIS,
} from "../redis.js";
import { logger } from "./monitoring/index.js";
import { sleep } from "./sleep.js";

const fetchLogger = logger.child({ subsystem: "fetch wrapper" });
const redisLogger = logger.child({ subsystem: "redis" });

const DISABLE_REDIS = process.env.DISABLE_REDIS ? true : false;
const BASE_URL = process.env.API_URL ?? "https://api.weather.gov";
const BASE_NWSCONNECT_URL = process.env.NWSCONNECT_API_URL ?? "https://preview-api.weather.gov";

const STANDARD_HEADERS = {
  "User-Agent": "beta.weather.gov interop",
};
if (process.env.API_KEY) {
  STANDARD_HEADERS["API-Key"] = process.env.API_KEY;
}

// Set the maximum number of open connections we will check against
// before any requests are actually sent out. 
export const MAX_OPEN_CONNECTIONS = parseInt(process.env.MAX_OPEN_CONNECTIONS) || 16_000;

const AGENT = new undici.Agent({ pipelining: 10, allowH2: true, connections: 20 });
undici.setGlobalDispatcher(
  AGENT,
);

/**
 * Helper function to get all of the current unresolved connections for every
 * origin that the unidici Agent is tracking
 */
export const getNumOpenConnections = () => {
  const stats = AGENT.stats;
  return Object.keys(stats).map(key => {
    const pool = stats[key];
    return pool.size;
  }).reduce((a, b) => {
    return a + b;
  }, 0);
};

/**
 * Helper function that returns true if the  number of
 * open  unidici connections is at or exceeds
 * the configured max number.
 */
export const atMaxNumConnections = () => {
  const openConnections = getNumOpenConnections();
  fetchLogger.trace({ openConnections }, "current open connections");
  if (openConnections >= MAX_OPEN_CONNECTIONS) {
    return true;
  }
  return false;
};

fetchLogger.trace({ max: MAX_OPEN_CONNECTIONS }, "Initializing max open connections");

const internalFetch = async (path) => {
  let url = URL.canParse(path) ? URL.parse(path) : new URL(path, BASE_URL);

  const headers = { ...STANDARD_HEADERS };

  // If the hostname is specified in the original request, preserve that as
  // a special header. In dev environments, our magic proxy will pick this up
  // to use for routing.
  if (URL.canParse(path)) {
    headers["wx-host"] = url.hostname;
  }

  const isWxStory = url.hostname === url.pathname.endsWith("/weatherstories");

  const isBriefing = url.hostname === url.pathname.endsWith("/briefings");

  if (isWxStory || isBriefing) {
    // If the incoming path matches a request to the website's weather story
    // or briefing endpoint, switch to the NWS Connect URL.
    url = new URL(url.pathname, BASE_NWSCONNECT_URL);
  }

  // Attempt to look up the request in the redis cache.
  // If present, we simply resolve with that response.
  // Otherwise, continue making the full network
  // request.
  // Note that we explicitly do not cache GHWO requests
  // for the moment.
  if (!DISABLE_REDIS && USE_REDIS) {
    url = new URL(url);
    const cachedValue = await getFromRedis(url.pathname);
    if (cachedValue) {
      redisLogger.trace({ pathname: url.pathname }, "returning cached value");
      return new Promise((resolve) => {
        resolve(cachedValue);
      });
    }
  }

  fetchLogger.trace({ url }, "making request");

  /**
   * Note: We have to force convert the URL object back to a string here,
   * because many of our tests mock the global fetch call based on specific
   * url strings being passed in as the first argument. They all fail if an object
   * gets passed in instead (in this case a URL instance)
   */
  return undici.request(url.toString(), { headers }).then(async (r) => {
    // If there are headers, get the correlation ID. There may not be one, but
    // that's beside the point. We'll attach the correlation ID to downstream
    // log messages about the success/failure of this response.
    const correlationID = r.headers?.["x-correlation-id"];

    if (r.statusCode >= 200 && r.statusCode < 400) {
      fetchLogger.trace({ path, correlationID });

      // 204 means no content
      if (r.status === 204) {
        return new Promise((resolve) => resolve({}));
      }

      // Cache the value, and then return the JSON
      // response if there is a valid cache-control
      // header value in the response
      if (USE_REDIS) {
        const ttl = getTTLFromResponse(r);
        if (ttl) {
          const json = await r.body.json();
          await saveToRedis(url.pathname, json, ttl);
          return json;
        }
      }
      return r.body.json();
    }

    const response = await r.body.json();
    fetchLogger.error({
      path,
      status: r.status,
      correlationID,
      response,
    });

    // If there was a server error, retry. These are often temporary.
    if (r.statusCode >= 500) {
      const error = new Error();
      error.cause = { ...response, status: r.statusCode };
      return Promise.reject(error);
    }

    // For request errors, don't retry. They're not likely to resolve on their
    // own so there's no point.
    return { status: r.statusCode, ...response, error: true };
  });
};

export const fetchAPIJson = async (path, { wait = sleep } = {}) =>
  internalFetch(path)
    .catch((e) => {
      if (e.statusCode === 429) {
        return { ...e.cause, error: true, statusCode: e.statusCode };
      } else {
        return wait(75).then(() => internalFetch(path));
      }
    })
    .catch(() => wait(124).then(() => internalFetch(path)))
    .catch(() => wait(204).then(() => internalFetch(path)))
    .catch(() => wait(337).then(() => internalFetch(path)))
    .catch((e) => {
      if (e instanceof SyntaxError) {
        // this can happen if the API or proxy returns HTML
        fetchLogger.error({ err: e, path }, "invalid JSON");
      } else {
        fetchLogger.error({ err: e, path });
      }
      return { ...e.cause, error: true };
    });

export { BASE_URL, BASE_NWSCONNECT_URL, fetchAPIJson as default };
