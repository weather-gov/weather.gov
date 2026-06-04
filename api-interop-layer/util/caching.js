/** @file Helpers for caching in Redis. */

export const GLOBAL_REDIS_DEFAULT_TTL = 30;

/**
 * Given an incoming TTL, determine if it is valid
 * If so, return the number as-is.
 * If not, return the global default
 */
const getValidTTL = (ttl) => {
  if (ttl && ttl > 0) {
    return ttl;
  }
  return GLOBAL_REDIS_DEFAULT_TTL;
};

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
export const parseTTLFromHeaders = (
  headers,
  fallbackTTL = GLOBAL_REDIS_DEFAULT_TTL,
) => {
  const cacheHeader = headers?.["cache-control"];

  if (!cacheHeader) {
    return getValidTTL(fallbackTTL);
  }

  // For our purposes, we only care about the s-maxage directive,
  // if it is present
  const rx = /s-maxage=([0-9]+)/;
  const match = cacheHeader.match(rx);
  if (!match) {
    return getValidTTL(fallbackTTL);
  }

  // The second item in the match response will be the
  // captured group of digits. This is the TTL in seconds
  // that we care about, so return it.
  const parsedNum = parseInt(match[1]);
  if (isNaN(parsedNum)) {
    return getValidTTL(fallbackTTL);
  }
  return getValidTTL(parsedNum);
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
