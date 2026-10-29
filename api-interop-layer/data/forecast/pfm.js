import dayjs from "../../util/day.js";
import { logger } from "../../util/monitoring/index.js";
import { getLatestProduct } from "../products/index.js";
import { parsePFM } from "../products/pfm/parse.js";
import { parseSFT } from "../products/sft/parse.js";
import daily from "./daily.js";
import gridpoint from "./gridpoint.js";
import hourly from "./hourly.js";
import getForecast from "./index.js";

// SFT weather words as API icon conditions, night falls back to day
const SFT_WORDS = {
  SUNNY: { condition: "skc", day: "Sunny", night: "Clear" },
  CLEAR: { condition: "skc", day: "Clear" },
  MOSUNNY: { condition: "few", day: "Mostly sunny", night: "Mostly clear" },
  MOCLR: { condition: "few", day: "Mostly clear" },
  PTSUNNY: { condition: "sct", day: "Partly sunny", night: "Partly cloudy" },
  PTCLDY: { condition: "sct", day: "Partly cloudy" },
  MOCLDY: { condition: "bkn", day: "Mostly cloudy" },
  CLOUDY: { condition: "ovc", day: "Cloudy" },
  SHWRS: { condition: "rain_showers", day: "Showers" },
  RAIN: { condition: "rain", day: "Rain" },
  TSTMS: { condition: "tsra", day: "Thunderstorms" },
  FOG: { condition: "fog", day: "Fog" },
  HAZE: { condition: "haze", day: "Haze" },
  WINDY: { condition: "wind_skc", day: "Windy" },
  HOT: { condition: "hot", day: "Hot" },
};

const forecastLogger = logger.child({ subsystem: "pfm-forecast" });

const PRODUCT_LOCATIONS = { PQW: "PQ2", PQE: "PQ1" };

// Koror has no PFM entry, Palau airport is the same island
const PFM_ZONES = { PWZ004: "PWZ003" };

const HOUR = 60 * 60 * 1000;

// PFM 12 hr columns are 6 to 6 ChST, at most 3 hrs off local 6 to 6 across PW/FM/MH
const PERIOD_MATCH = 3 * HOUR;

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const toNumber = (value) => (value === undefined ? null : Number(value));

const toDegrees = (cardinal) => {
  const index = CARDINALS.indexOf(cardinal);
  return index === -1 ? null : index * 45;
};

const maxMin = ({ values }) => values["MAX/MIN"] ?? values["MIN/MAX"];

// /forecast periods from now until the PFM runs out of highs and lows
export const toForecast = (steps, sftDays, timezone) => {
  const twelveHourSteps = steps.filter((step) => maxMin(step) !== undefined);
  const periods = [];

  const now = new Date();
  now.setUTCMinutes(0, 0, 0);

  let start = dayjs(now).tz(timezone);
  for (;;) {
    const hour = start.hour();
    const isDaytime = hour >= 6 && hour < 18;
    let end = start.hour(isDaytime ? 18 : 6).startOf("hour");
    if (hour >= 18) {
      end = end.add(1, "day");
    }

    const endTime = end.valueOf();
    const step = twelveHourSteps.find(
      ({ time }) => Math.abs(time - endTime) <= PERIOD_MATCH,
    );
    if (!step) {
      // Right after issuance the first high/low closes the next period, so skip ahead to it
      if (!periods.length && endTime < twelveHourSteps.at(-1)?.time) {
        start = end;
        continue;
      }
      break;
    }

    // SFT words are daytime, the night after a day and the overnight before the first SFT day reuse them
    const date = end.subtract(12, "hour").format("YYYY-MM-DD");
    const sftDay =
      sftDays.find((day) => day.date === date) ??
      sftDays.find((day) => day.date > date);
    const word = SFT_WORDS[sftDay?.word];
    if (sftDay?.word && !word) {
      forecastLogger.warn({ word: sftDay.word }, "unknown SFT weather word");
    }

    periods.push({
      startTime: start.format(),
      endTime: end.format(),
      isDaytime,
      icon: word
        ? `https://api.weather.gov/icons/land/${isDaytime ? "day" : "night"}/${word.condition}`
        : null,
      shortForecast: word
        ? isDaytime
          ? word.day
          : (word.night ?? word.day)
        : "",
      temperature: toNumber(maxMin(step)),
      probabilityOfPrecipitation: {
        unitCode: "wmoUnit:percent",
        value: toNumber(step.values["POP 12HR"]),
      },
      windSpeed: null,
      windDirection: null,
    });

    start = end;
  }

  return { properties: { periods } };
};

// /forecast/hourly periods, one hour per step with the condition of the period it falls in
export const toHourly = (steps, forecast) => ({
  properties: {
    periods: steps.flatMap(({ time }) => {
      const period = forecast.properties.periods.find(
        ({ startTime, endTime }) =>
          new Date(startTime) <= time && time < new Date(endTime),
      );
      return period
        ? [
            {
              startTime: time.toISOString(),
              endTime: new Date(time.getTime() + HOUR).toISOString(),
              icon: period.icon,
              shortForecast: period.shortForecast,
            },
          ]
        : [];
    }),
  },
});

// /gridpoints layers with each step lasting an hour, so no hours get filled in between
export const toGridpoint = (steps) => {
  const popSteps = steps.filter(({ values }) => values["POP 12HR"]);

  const layer = (uom, read) => ({
    uom,
    values: steps.map((step) => ({
      validTime: `${step.time.toISOString()}/PT1H`,
      value: read(step),
    })),
  });

  return {
    properties: {
      temperature: layer("wmoUnit:degF", ({ values }) => toNumber(values.TEMP)),
      apparentTemperature: layer("wmoUnit:degF", ({ values }) =>
        toNumber(values["HEAT INDEX"]),
      ),
      dewpoint: layer("wmoUnit:degF", ({ values }) => toNumber(values.DEWPT)),
      relativeHumidity: layer("wmoUnit:percent", ({ values }) =>
        toNumber(values.RH),
      ),
      windSpeed: layer("wxgov:mph", ({ values }) =>
        toNumber(values["WIND SPD"]),
      ),
      windGust: layer("wxgov:mph", () => null),
      windDirection: layer("wmoUnit:degree_(angle)", ({ values }) =>
        toDegrees(values["WIND DIR"] ?? values["PWIND DIR"]),
      ),
      // POP 12HR sits at the end of its 12 hr window
      probabilityOfPrecipitation: layer("wmoUnit:percent", ({ time }) =>
        toNumber(popSteps.find((pop) => pop.time > time)?.values["POP 12HR"]),
      ),
      // QPF 12HR also sits at the end of its window, in inches
      quantitativePrecipitation: {
        uom: "wmoUnit:mm",
        values: steps
          .filter(({ values }) => values["QPF 12HR"] !== undefined)
          .map(({ time, values }) => ({
            validTime: `${new Date(time - 12 * HOUR).toISOString()}/PT12H`,
            value: Number(values["QPF 12HR"]) * 25.4,
          })),
      },
      iceAccumulation: { uom: "wmoUnit:mm", values: [] },
      snowfallAmount: { uom: "wmoUnit:mm", values: [] },
    },
  };
};

// Zone-resolved grids run the gridpoint pipeline on PFM + SFT shaped as API responses
export default async ({ grid, place }) => {
  const location = PRODUCT_LOCATIONS[grid.wfo];
  const [pfm, sft] = await Promise.all([
    getLatestProduct("PFM", location),
    getLatestProduct("SFT", location),
  ]);

  if (pfm.error) {
    return { gridData: {}, daily: { error: true } };
  }

  // SFT only adds icons and words, so a bad one leaves the forecast without them
  let sftDays = [];
  try {
    sftDays = sft.error
      ? []
      : (parseSFT(sft.productText, sft.issuanceTime)[grid.zone]?.days ?? []);
  } catch (err) {
    forecastLogger.warn({ err, location }, "unparseable SFT");
  }

  // Hand-typed products can be malformed in ways that throw, which would fail the whole point
  let forecast, gridpointData, hourlyData;
  try {
    const entry = parsePFM(pfm.productText)[PFM_ZONES[grid.zone] ?? grid.zone];
    if (!entry) {
      return { gridData: {}, daily: { error: true, noForecast: true } };
    }

    const { steps } = entry;
    forecast = toForecast(steps, sftDays, place.timezone);
    forecast.properties.generatedAt = pfm.issuanceTime;
    forecast.properties.updateTime = pfm.issuanceTime;

    gridpointData = toGridpoint(steps);
    hourlyData = toHourly(steps, forecast);
  } catch (err) {
    forecastLogger.error({ err, location, zone: grid.zone }, "unparseable PFM");
    return { gridData: {}, daily: { error: true } };
  }

  return getForecast(
    { grid, place },
    {
      gridpoint: async (_, place, hours) =>
        gridpoint(gridpointData, hours, place),
      daily: async (_, place) => daily(forecast, place),
      hourly: async (_, hours) => hourly(hourlyData, hours),
      nonHourly: true,
    },
  );
};
