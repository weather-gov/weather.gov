import dayjs from "../util/day.js";
import { Pool } from "undici";
import POOL_SETTINGS from "../data/poolSettings.js";
import { requestPlainText } from "../util/request.js";

export const radarTimestamps = {
  start: null,
  end: null,
  last: 0
};

const radarHost = process.env.RADAR_URL ?? "https://opengeo.ncep.noaa.gov";

// 10 seconds
const RADAR_METADATA_TTL = 10;

// A pool for requests for radar metadata
export const radarPool = new Pool(
  radarHost,
  POOL_SETTINGS
);

export const getRadarMetadata = async ({
  place,
  point: { latitude, longitude },
}) => {
  if (!place || place.error || !place.timezone) {
    return { start: null, end: null };
  }
  const timezone = place.timezone;

  // Only update the radar timestamps once a minute
  if (Date.now() - radarTimestamps.last > 60_000) {
    try {
      // We can query the geoserver's capabilities to get information about
      // layers, which includes time extents.
      const { data } = await requestPlainText(
        radarPool,
        "/geoserver/conus/conus_bref_qcd/ows?service=wms&version=1.1.1&request=GetCapabilities",
        { Accept: "application/xml", "wx-host": "opengeo.ncep.noaa.gov" }
      );

      // It's XML. Yay. Anyway, all of the times are listed as a single long
      // string, separated by commas. The most recent is at the end. CMI only
      // uses 20 frames, so we extract the last 20 timestamps.
      const [, times] = data.match(/<Extent name="time".*>(.+)<\/Extent>/);
      const range = times.split(",").slice(-20);

      // Stash those off.
      radarTimestamps.start = range[0];
      radarTimestamps.end = range.pop();
      radarTimestamps.last = Date.now();
    } catch (e) {
      // For now, just eat any exceptions. They should be short-lived.
    }
  }

  const start = dayjs.utc(radarTimestamps.start).tz(timezone).format();
  const end = dayjs.utc(radarTimestamps.end).tz(timezone).format();

  return {
    start,
    end,

    // The settings is a base64-encoded JSON string telling radar.weather.gov
    // what we want to look at. For our purposes, we really only care about
    // centering on the same point and setting roughly the same zoon level.
    settings: btoa(
      JSON.stringify({
        agenda: {
          id: "weather",
          center: [longitude, latitude],
          zoom: 8,
          layer: "bref_qcd",
        },
      }),
    ),
  };
};
