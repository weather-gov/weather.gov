import { createLogger } from "../util/monitoring/index.js";
import { fetchAPIJson } from "../util/fetch.js";

const logger = createLogger("satellite");

export default async ({ grid: { wfo } }) => {
  try {
    const satelliteMetadata = await fetchAPIJson(
      `https://cdn.star.nesdis.noaa.gov/WFO/catalogs/WFO_02_${wfo.toLowerCase()}_catalog.json`,
    );

    const satellite = satelliteMetadata?.meta?.satellite;
    if (satellite) {
      const goes = satellite === "GOES-West" ? "GOES18" : "GOES16";

      return {
        gif: `https://cdn.star.nesdis.noaa.gov/WFO/${wfo.toLowerCase()}/GEOCOLOR/${goes}-${wfo.toUpperCase()}-GEOCOLOR-600x600.gif`,
        mp4: `https://cdn.star.nesdis.noaa.gov/WFO/${wfo.toLowerCase()}/GEOCOLOR/${goes}-${wfo.toUpperCase()}-GEOCOLOR-600x600.mp4`,
      };
    }
  } catch (e) {
    logger.error(`Error getting satellite metadata for ${wfo}`);
    logger.error(e.message);
  }

  return { error: true };
};
