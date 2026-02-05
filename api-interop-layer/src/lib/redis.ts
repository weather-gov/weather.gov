import { createClient, RedisClientType } from "@redis/client";
import { logger } from "../util/monitoring/index.js";

// For now, let's use a single client instance
// that we lazily assign once accessed.
let client: RedisClientType | null;
export let USE_REDIS = false;

// We need to know whether to use TLS or not
// For local dev, we don't
const protocol = process.env.API_INTEROP_PRODUCTION ? "rediss" : "redis";

// Let's lazy set the connection info, since
// that will  not change in a single environment
interface ConnectionInfo {
  password?: string;
  host?: string;
  port?: string | number;
}
let CONNECTION_INFO: ConnectionInfo | undefined;

const redisLogger = logger.child({ subsystem: "redis" });

export const getRedisConnectionInfo = (): ConnectionInfo => {
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
    const vcap = JSON.parse(process.env.VCAP_SERVICES || "{}");
    const db = vcap["aws-elasticache-redis"][0];
    CONNECTION_INFO = {
      password: db.credentials.password,
      host: db.credentials.host,
      port: db.credentials.port,
    };
    return CONNECTION_INFO!;
  }

  const REQUIRED_ENV_VARS = ["REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD"];
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      redisLogger.warn("redis is disabled for cache");
      return {};
    }
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
 * Attempt to retrieve a TTL for caching from the
 * Cache-Control header of a Response object.
 * Typical use is in API communications where the
 * header is present.
 * @param {Response} response - The HTTP response object
 * to check for the Cache-Control header
 * @returns {Number|null} An integer representing seconds
 * for the cache TTL, otherwise null if the header is not present
 */
export const getTTLFromResponse = (response: Response): number | null => {
  const cacheHeader = response.headers.get("Cache-Control");
  if (!cacheHeader) {
    return null;
  }

  // For our purposes, we only care about the s-maxage directive,
  // if it is present
  const rx = /s-maxage=([0-9]+)/;
  const match = cacheHeader.match(rx);
  redisLogger.debug({ match }, "cache-control header");
  if (!match) {
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
 * environment variables or cloud.gov servace instances that we
 * have configured for making the connection
 * @returns {Object|null} - A connected redis client instance or, if
 * not available, null
 */
export const getRedisClient = async (): Promise<RedisClientType | null> => {
  if (client) {
    return client;
  }
  try {
    const { password, host, port } = getRedisConnectionInfo();
    const url = `${protocol}://default:${password}@${host}:${port}`;
    redisLogger.info({ url }, "connecting");
    client = createClient({ url }) as RedisClientType;
    client.on("error", (err) => {
        redisLogger.error({ err }, "Client error");
      });
    await client.connect();
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
export const saveToRedis = async (key: string, value: string, ttl: number) => {
  if (!USE_REDIS) {
    return null;
  }
  const client = await getRedisClient();
  if (!client) return null;
  return await client.set(key, value, { EX: ttl }).then(() => {
    redisLogger.debug({ key, ttl }, "cached value");
  });
};

/**
 * Attempts to retrieve the value at the provided key.
 * Will immediately return null if USE_REDIS is false.
 * @param {String} key - The key to retrieve a value for
 * @returns {String|null} - A result string if there is a value
 * for the given key, or null if there is not (or if USE_REDIS is false).
 */
export const getFromRedis = async (key: string): Promise<string | null> => {
  if (!USE_REDIS) {
    return null;
  }
  const client = await getRedisClient();
  if (!client) return null;
  return await client.get(key);
};
