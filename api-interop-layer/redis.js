import { createClient } from "redis";
import { logger } from "./util/monitoring/index.js";

// For now, let's use a single client instance
// that we lazily assign once accessed.
let client;
export let USE_REDIS = false;

// We need to know whether to use TLS or not
// For local dev, we don't
const protocol = process.env.API_INTEROP_PRODUCTION ? "rediss" : "redis";

// Let's lazy set the connection info, since
// that will  not change in a single environment
let CONNECTION_INFO;

const redisLogger = logger.child({ subsystem: "redis" });

export const getRedisConnectionInfo = () => {
  // If we have already lazy set the connection info,
  // just return that.
  if (CONNECTION_INFO) {
    return CONNECTION_INFO;
  }

  if (process.env.API_INTEROP_PRODUCTION) {
    USE_REDIS = true;
    redisLogger.info("interop is using redis for cache in prod");
    // we are in a cloud.gov environment and must retrieve credentials from
    // the VCAP_SERVICES environment variable
    const vcap = JSON.parse(process.env.VCAP_SERVICES);
    const db = vcap["aws-elasticache-redis"][0];
    CONNECTION_INFO = {
      password: db.credentials.password,
      host: db.credentials.host,
      port: db.credentials.port,
    };
    return CONNECTION_INFO;
  }

  const REQUIRED_ENV_VARS = ["REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD"];
  const missing = REQUIRED_ENV_VARS.some((varName) => !process.env[varName]);

  if (missing) {
    redisLogger.warn("redis is disabled for cache");
    USE_REDIS = false;
    return null;
  }

  USE_REDIS = true;
  redisLogger.info("interop is using redis for cache in dev");

  CONNECTION_INFO = {
    password: process.env["REDIS_PASSWORD"],
    host: process.env["REDIS_HOST"],
    port: process.env["REDIS_PORT"],
  };

  return CONNECTION_INFO;
};

// Call it the first time to set the info variable
// lazily. And I mean as lazy as possible.
getRedisConnectionInfo();

/**
 * Attempt retrieve a TTL for caching from a
 * Cache-Control header of a Headers object.
 * Typical use is in API communications where the header
 * is present.
 * @param {Headers} headers - The HTTP response headers
 * object to check for the Cache-Control header
 * @returns {Number|null} An integer representing seconds
 * for the cache TTL, otherwise null if the header is not
 * present.
 */
export const parseTTLFromHeaders = (headers) => {
  const cacheHeader = headers?.["cache-control"];
  if(!cacheHeader){
    return null;
  }

  // For our purposes, we only care about the s-maxage directive,
  // if it is present
  const rx = /s-maxage=([0-9]+)/;
  const match = cacheHeader.match(rx);
  if (!match) {
    return null;
  }

  // The second item in the match response will be the
  // captured group of digits. This is the TTL in seconds
  // that we care about, so return it.
  const parsedNum = parseInt(match[1]);
  if(isNaN(parsedNum)){
    return null;
  }
  return parsedNum;
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
  return parseTTLFromHeaders(response?.headers);
};

/**
 * Attempts to get a connected instance of a redis client
 * for querying purposes.
 * In this module, a top-level client variable exists. If it
 * is already assigned to a redis client, we simply return that.
 * Otherwise, we attempt to connect a live client using the
 * environment variables or cloud.gov servace instances that we
 * have configured for making the connection
 * @returns {Object|null} - A connected redis client instance or, if
 * not available, null
 */
export const getRedisClient = async () => {
  if (client) {
    return client;
  }
  try {
    const connectionInfo = getRedisConnectionInfo();
    if (!connectionInfo) {
      return null;
    }
    const { password, host, port } = connectionInfo;
    const url = `${protocol}://default:${password}@${host}:${port}`;
    redisLogger.info({ url }, "connecting");
    client = await createClient({ url })
      .on("error", (err) => {
        redisLogger.error({ err }, "Client error");
      })
      .connect();
    return client;
  } catch (e) {
    redisLogger.error({ err: e }, "Could not connect to redis");
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
  if (!USE_REDIS) {
    return null;
  }
  const client = await getRedisClient();

  try {
    await client.json.set(key, "$", value);
    await client.expire(key, ttl);
    redisLogger.trace({ key, ttl }, "Saved cached value");
  } catch (e) {
    redisLogger.error(e);
  }
};

/**
 * Attempts to retrieve the value at the provided key.
 * Will immediately return null if USE_REDIS is false.
 * @param {String} key - The key to retrieve a value for
 * @returns {String|null} - A result string if there is a value
 * for the given key, or null if there is not (or if USE_REDIS is false).
 */
export const getFromRedis = async (key) => {
  if (!USE_REDIS) {
    return null;
  }
  const client = await getRedisClient();
  const result = await client.json.get(key);
  if(result){
    return result;
  }
  return null;
};
