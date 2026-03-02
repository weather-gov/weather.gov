import { logger } from "../util/monitoring/index.js";
import { requestJSONWithHeaders } from "../util/request.js";
import { getFromRedis, saveToRedis, parseTTLFromHeaders } from "../redis.js";
import weatherStoryPool from "./weatherStoryPool.js";

const briefingsLogger = logger.child({ subsystem: "briefings" });
// 1 hr
const DEFAULT_BRIEFING_CACHE_TTL = 3600;

export default async (wfo) => {
  try {
    const url = `/offices/${wfo}/briefing`;

    // Attempt to pull from the cache
    const foundInCache = await getFromRedis(url);
    if(foundInCache){
      return foundInCache;
    }

    const response = await requestJSONWithHeaders(
      weatherStoryPool,
      url
    );

    if(response.error && response.error.cause?.statusCode === 404){
      // Temporary measure. While we wait for the prod API to have office
      // briefings, we will interpret 404s to mean there are no briefing
      // for the WFO. All other errors remain errors.
      return { briefing: null };
    } else if(response.error){
      throw response;
    }

    const [ result, headers ] = response;
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

    let briefing;
    if (result?.briefing) {
      briefing = { briefing: result.briefing };
    } else if (!result.error) {
      briefing = { briefing: null };
    }

    if(briefing){
      // Attempt to cache the briefing
      let ttl = parseTTLFromHeaders(headers);
      if(!ttl){
        ttl = DEFAULT_BRIEFING_CACHE_TTL;
      }
      await saveToRedis(
        url,
        briefing,
        ttl
      );
      return briefing;
    }
  } catch (e) {
    briefingsLogger.error({ err: e, wfo }, "Error getting briefing packet");
  }

  return { error: true };
};
