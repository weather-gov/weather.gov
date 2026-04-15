/**
 * Fetch the list of all Area Forecast Discussion
 * versions
 */
import { parseTTLFromHeaders } from "../../util/caching.js";
import { requestJSONWithHeaders } from "../../util/request.js";
import { logger } from "../../util/monitoring/index.js";
import connectionPool from "../../connectionPool.js";
import { getFromRedis, saveToRedis } from "../../redis.js";

const productLogger = logger.child({subsystem: "product:afd"});

export default async () => {
  const url = "/products/types/AFD";

  try {
    // Check the redis cache for any stored value.
    // Return that if we find one.
    const foundInCache = await getFromRedis(url);
    if(foundInCache){
      return foundInCache;
    }

    // Fetch from the API
    const [ data, headers ] = await requestJSONWithHeaders(
      connectionPool,
      url
    );

    // Cache and return the result
    let ttl = parseTTLFromHeaders(headers);
    if(!ttl){
      // API headers seem to indicate 120 as the ttl
      ttl = 120;
    }
    await saveToRedis(url, data, ttl);
    return data;
  } catch(e) {
    productLogger.error({e});

    return {
      error: true,
      status: e.cause?.statusCode || e.statusCode || 500
    };
  }
};
