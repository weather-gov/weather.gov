import { logger } from "../util/monitoring/index.js";
import weatherStoryPool from "./weatherStoryPool.js";
import { requestJSONWithHeaders } from "../util/request.js";
import { getFromRedis, saveToRedis, parseTTLFromHeaders } from "../redis.js";

const weatherStoriesLogger = logger.child({ subsystem: "weatherstories" });
// 1 hr
const DEFAULT_STORIES_CACHE_TTL = 3600;

export default async (wfo) => {
  try {
    // Try to pull from the cache first
    const url = `/offices/${wfo}/weatherstories`;
    const foundInCache = getFromRedis(url);
    if(foundInCache){
      return foundInCache;
    }

    // Otherwise, fetch the data from the API
    const response = await requestJSONWithHeaders(
      weatherStoryPool,
      url
    );

    if(response.error && response.error.cause?.statusCode === 404){
      // Temporary measure. While we wait for the prod API to have weather
      // stories, we will interpret 404s to mean there are no weather
      // stories for the WFO. All other errors remain errors.
      return [];
    } else if(response.error){
      throw response;
    }

    const [result, headers] = response;
    // Example return object:
    // {
    //   "@context": {
    //       "@version": "1.1"
    //   },
    //   "stories": [
    //       {
    //           "id": "7ccab810-706b-401c-8757-71f656e56270",
    //           "officeId": "MPX",
    //           "startTime": "2026-01-01T12:00:00+00:00",
    //           "endTime": "2027-01-01T12:00:00+00:00",
    //           "updateTime": "2026-01-10T12:00:00+00:00",
    //           "title": "Testing the test",
    //           "description": "This is a triumph. I'm making a note here: huge success",
    //           "altText": "Alternative to text? Pictures!",
    //           "priority": false,
    //           "order": 1,
    //           "download": "http://localhost:8000/offices/MPX/weatherstories/7ccab810-706b-401c-8757-71f656e56270/image"
    //       },
    //     ...
    //   ]
    // }
    const stories = result?.stories;
    if (stories) {
      // Attempt to cache the value
      let ttl = parseTTLFromHeaders(headers);
      if(!ttl){
        ttl = DEFAULT_STORIES_CACHE_TTL;
      }
      await saveToRedis(
        url,
        stories,
        ttl
      );
      return stories;
    }
  } catch (e) {
    weatherStoriesLogger.error({ err: e, wfo }, "Error getting weather stories");
  }

  return { error: true };
};
