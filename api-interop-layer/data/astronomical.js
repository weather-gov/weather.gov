import SunCalc from "suncalc";
import dayjs from "../util/day.js";

const convert = (what, tz) =>
  !isNaN(what) ? dayjs(what).tz(tz).format() : what;

/**
 * Calculate sunrise and sunset when the API is not available.
 */
export default (tz, lat, lon) => {
  const when = dayjs(new Date()).tz(tz);
  const result = SunCalc.getTimes(when, lat, lon);
  return {
    sunrise: convert(result.sunrise, tz),
    sunset: convert(result.sunset, tz),
    transit: convert(result.solarNoon, tz),
    civilTwilightBegin: convert(result.dawn, tz),
    civilTwilightEnd: convert(result.dusk, tz),
    nauticalTwilightBegin: convert(result.nauticalDawn, tz),
    nauticalTwilightEnd: convert(result.nauticalDusk, tz),
    astronomicalTwilightBegin: convert(result.nightEnd, tz),
    astronomicalTwilightEnd: convert(result.night, tz),
  };
};
