import { createClient } from "@redis/client";
import { createLogger } from "./util/monitoring/index.js";

// For now, let's use a single client instance
// that we lazily assign once accessed.
let client;

const logger = createLogger("redis");

// To determine whether or not the interop should even
// attempt to use redis, we look for the WX_USE_REDIS
// environment variable. If it is present and explicitly set
// to "true", we will attempt to make real redis connections.
export const USE_REDIS = (process.env.WX_USE_REDIS === "true");

// Log whether or not redis is enabled for the current session
if(USE_REDIS){
  logger.warn("interop will attempt to use redis for cache");
} else {
  logger.warn("redis is disabled for cache");
}

// Required environment variables for authentication
// and connection. These will be validated.
const REQUIRED_ENV_VARS = [
  "REDIS_HOST",
  "REDIS_PORT",
  "REDIS_CREDS"
];

/**
 * Check to make sure we are using the correct
 * environment variables for redis.
 * This function should only be called within
 * functions where USE_REDIS is true.
 * See above.
 */
const ensureEnvironmentVariables = () => {
  const missing = [];
  REQUIRED_ENV_VARS.forEach(varName => {
    if(!process.env[varName]){
      missing.push(varName);
    }
  });
  if(missing.length){
    const msg = `Missing required redis environment variables: ${missing.join(", ")}`;
    logger.error(msg);
    throw new Error(msg);
  }
};

/**
 * Attempt to retrieve a TTL for caching from the
 * Cache-Control header of a Response object.
 * Typical use is in API communications where the
 * header is present.
 * @param {Response} response - The HTTP response object
 * to check for the Cache-Control header
 * @returns {Number|null} An integer representing seconds
 * for the cache TTL, otherwise null if the header is not present
 */
export const getTTLFromResponse = (response) => {
  const cacheHeader = response.headers.get("Cache-Control");
  if(!cacheHeader){
    return null;
  }

  // For our purposes, we only care about the s-maxage directive,
  // if it is present
  const rx = /s-maxage=([0-9]+)/;
  const match = cacheHeader.match(rx);
  logger.verbose(`Cache-control header match: ${match}`);
  if(!match){
    return null;
  }

  // The second item in the match response will be the
  // captured group of digits. This is the TTL in seconds
  // that we care about, so return it.
  return parseInt(match[1]);
};

/**
 * Attempts to get a connected instance of a redis client
 * for querying purposes.
 * In this module, a top-level client variable exists. If it
 * is already assigned to a redis client, we simply return that.
 * Otherwise, we attempt to connect a live client using the
 * environment variables that we have configured for making
 * the connection (see `ensureEnvironmentVariables()` above).
 * This function will immediately return null if USE_REDIS is false.
 * @returns {Object|null} - A connected redis client instance or, if
 * not available, null
 */
export const getRedisClient = async () => {
  if(client){
    return client;
  }
  try {
    ensureEnvironmentVariables();
    const url = `redis://default:${process.env.REDIS_CREDS}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
    logger.verbose(`Connecting to ${url}`);
    client = await createClient({url})
      .on("error", err => {
        logger.error(`Client error: ${err}`);
      })
      .connect();
    return client;
  } catch(e){
    logger.error(`Could not connect to redis: ${e}`);
    client = null;
    return null;
  }
};

/**
 * Attempt to save the value to the provided key using the given
 * ttl in seconds.
 * This function will immediately return null if USE_REDIS is false.
 * @param {String} key - The key to save to
 * @param {String} value - The value to save for the key
 * @param {Number} ttl - An integer specifying the TTL in seconds
 * @returns {Object|null} - A redis client instance or null
 */
export const saveToRedis = async (key, value, ttl) => {
  if(!USE_REDIS){
    return null;
  }
  const client = await getRedisClient();
  return await client.set(
    key,
    value,
    { EX: ttl }
  ).then(() => {
    logger.verbose(`Saved cached value for ${key} with TTL ${ttl}`);
  });
};

/**
 * Attempts to retrieve the value at the provided key.
 * Will immediately return null if USE_REDIS is false.
 * @param {String} key - The key to retrieve a value for
 * @returns {String|null} - A result string if there is a value
 * for the given key, or null if there is not (or if USE_REDIS is false).
 */
export const getFromRedis = async (key) => {
  if(!USE_REDIS){
    return null;
  }
  const client = await getRedisClient();
  return await client.get(key);
};
