import dayjs from "../util/day.js";
import { logger } from "../util/monitoring/index.js";
import { fetchAPIJson } from "../util/fetch.js";

const satelliteLogger = logger.child({ subsystem: "satellite" });

export default async ({ grid: { wfo }, place: { timezone } }) => {
  try {
    const satelliteMetadata = await fetchAPIJson(
      `https://cdn.star.nesdis.noaa.gov/WFO/catalogs/WFO_02_${wfo.toLowerCase()}_catalog.json`,
    );

    const satellite = satelliteMetadata?.meta?.satellite;
    if (satellite) {
      const goes = satellite === "GOES-West" ? "GOES18" : "GOES19";

      // The NESDIS metadata has earliest and latest timestamps, but those
      // are for the full range of available images, which cover over 24 hours.
      // We use the video, which only covers the past 8 hours.
      //
      // The timestamps provided are also in a wonky format:
      //  [four-digit year][day of year][24hr time]
      //
      // Rather than parse those timestamps, we can use the observation_time
      // metadata. And then we can just subtract 8 hours from it. Done-zo!
      const end = dayjs(satelliteMetadata.meta.observation_time);
      const start = end.subtract(8, "hours");

      const startTZ = start.tz(timezone);
      const endTZ = end.tz(timezone);

      return {
        times: {
          start: startTZ.format(),
          end: endTZ.format(),
        },
        latest: `https://cdn.star.nesdis.noaa.gov/WFO/${wfo.toLowerCase()}/GEOCOLOR/latest.jpg`,
        gif: `https://cdn.star.nesdis.noaa.gov/WFO/${wfo.toLowerCase()}/GEOCOLOR/${goes}-${wfo.toUpperCase()}-GEOCOLOR-600x600.gif`,
        mp4: `https://cdn.star.nesdis.noaa.gov/WFO/${wfo.toLowerCase()}/GEOCOLOR/${goes}-${wfo.toUpperCase()}-GEOCOLOR-600x600.mp4`,
      };
    }
  } catch (e) {
    satelliteLogger.error({ err: e, wfo }, "Error getting satellite metadata");
  }

  return { error: true };
};
