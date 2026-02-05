import dayjs from "../util/day.js";

let radarTimestampsLast = 0;
const radarTimestamps = {
  start: null,
  end: null,
};

export const getRadarMetadata = async ({
  place,
  point: { latitude, longitude },
}) => {
  if (!place || place.error || !place.timezone) {
    return { start: null, end: null };
  }
  const timezone = place.timezone;

  // Only update the radar timestamps once a minute
  if (Date.now() - radarTimestampsLast > 60_000) {
    try {
      // We can query the geoserver's capabilities to get information about
      // layers, which includes time extents.
      const xml = await fetch(
        "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=wms&version=1.1.1&request=GetCapabilities",
      ).then((r) => r.text());

      // It's XML. Yay. Anyway, all of the times are listed as a single long
      // string, separated by commas. The most recent is at the end. CMI only
      // uses 20 frames, so we extract the last 20 timestamps.
      const [, times] = xml.match(/<Extent name="time".*>(.+)<\/Extent>/);
      const range = times.split(",").slice(-20);

      // Stash those off.
      radarTimestamps.start = range[0];
      radarTimestamps.end = range.pop();
      radarTimestampsLast = Date.now();
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
