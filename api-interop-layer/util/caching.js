/** @file Helpers for caching in Redis. */

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
  if (!cacheHeader) {
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
  if (isNaN(parsedNum)) {
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
