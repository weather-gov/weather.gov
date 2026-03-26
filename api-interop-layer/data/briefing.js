import { logger } from "../util/monitoring/index.js";
import { parseTTLFromHeaders } from "../util/caching.js";
import { requestJSONWithHeaders } from "../util/request.js";
import { getFromRedis, saveToRedis } from "../redis.js";
import connectionPool from "./connectionPool.js";

const briefingsLogger = logger.child({ subsystem: "briefings" });
// 1 hr
const DEFAULT_BRIEFING_CACHE_TTL = 3600;

export default async (wfo) => {
  const url = `/offices/${wfo}/briefing`;

  try {
    // Attempt to pull from the cache
    const foundInCache = await getFromRedis(url);
    if (foundInCache) {
      return foundInCache;
    }

    const [result, headers] = await requestJSONWithHeaders(
      connectionPool,
      url,
    );

    // Example return object:
    // {
    //   "@context": {
    //       "@version": "1.1"
    //   },
    //   "briefing": {
    //       "id": "7ccab810-706b-401c-8757-71f656e56270",
    //       "startTime": "2026-01-01T12:00:00+00:00",
    //       "endTime": "2027-01-01T12:00:00+00:00",
    //       "updateTime": "2026-01-10T12:00:00+00:00",
    //       "title": "A short tab title",
    //       "description": "A longer description of the briefing packet contents.",
    //       "priority": false,
    //       "officeId": "MPX",
    //       "download": "http://localhost:8000/offices/MPX/briefing/download/7ccab810-706b-401c-8757-71f656e56270"
    //   }
    // }

    // Because we use 'throw', we know if we reach this line, the request succeeded.
    const briefing =
      result && result.briefing
        ? { briefing: result.briefing }
        : { briefing: null };

    let ttl = parseTTLFromHeaders(headers) || DEFAULT_BRIEFING_CACHE_TTL;
    await saveToRedis(url, briefing, ttl);

    return briefing;
  } catch (e) {
    // Handle the specific 404 case as a non-error state
    if (e.cause?.statusCode === 404 || e.statusCode === 404) {
      briefingsLogger.trace({ wfo }, "No briefing found (404)");
      return { briefing: null };
    }

    // Log actual failures (500s, Network errors, etc.)
    briefingsLogger.error({ err: e, wfo }, "Error getting briefing packet");
    return { error: true };
  }
};
