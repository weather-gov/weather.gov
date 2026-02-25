import { fetchAPIJson } from "../util/fetch.js";
import { logger } from "../util/monitoring/index.js";

const briefingsLogger = logger.child({ subsystem: "briefings" });

export default async (wfo) => {
  try {
    const result = await fetchAPIJson(`/offices/${wfo}/briefing`);
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

    // Temporary measure. While we wait for the prod API to have office
    // briefings, we will interpret 404s to mean there are no briefing
    // for the WFO. All other errors remain errors.
    if (result.status === 404) {
      return { briefing: null };
    }

    if (result?.briefing) {
      return { briefing: result.briefing };
    }
    if (!result.error) {
      return { briefing: null };
    }
  } catch (e) {
    briefingsLogger.error({ err: e, wfo }, "Error getting briefing packet");
  }

  return { error: true };
};
