import { logger } from "../util/monitoring/index.js";
import { fetchAPIJson } from "../util/fetch.js";

const weatherStoriesLogger = logger.child({ subsystem: "weatherstories" });

export default async (wfo) => {
  try {
    const result = await fetchAPIJson(`/offices/${wfo}/weatherstories`);
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
    //           "image": "http://localhost:8000/offices/MPX/weatherstories/7ccab810-706b-401c-8757-71f656e56270/image"
    //       },
    //     ...
    //   ]
    // }

    const stories = result?.stories;
    if (stories) {
      return stories;
    }
  } catch (e) {
    weatherStoriesLogger.error({ err: e, wfo }, "Error getting weather stories");
  }

  return { error: true };
};
