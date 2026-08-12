import openDatabase from "./db.js";
import { logger } from "../util/monitoring/index.js";

const wpcProbLogger = logger.child({ subsystem: "wpc prob precip" });

const PERIOD_HOURS = 24;

// Each bracket slot's source percentile, and the "at least this much" chance that percentile implies
const BRACKET = [
  ["low", 10, 0.9],
  ["expected", 50, 0.5],
  ["high", 90, 0.1],
];

// Both amounts and chances carry two decimals, and rounding also clears the float32 artifacts jsonb round-trips leave behind
const round = (value) => Math.round(value * 100) / 100;

// jsonb orders keys by length then bytewise, so "12.0" arrives between "1.00" and "2.00"
const numerically = (a, b) => Number(a) - Number(b);

const toRange = (percentiles) => {
  const range = {};
  for (const [slot, percentile, chance] of BRACKET) {
    const amount = percentiles[percentile];
    if (amount !== undefined) {
      range[slot] = { amount: round(amount), chance };
    }
  }
  return Object.keys(range).length > 0 ? range : null;
};

// Out of season WPC still publishes a full set of zeros, which is a variable worth no section rather than one worth an empty one
const isEmpty = ({ accumulation, percentiles = {}, probabilities = {} }) =>
  !accumulation &&
  Object.values(percentiles).every((amount) => amount === 0) &&
  Object.values(probabilities).every((chance) => chance === 0);

const toVariable = (data) => {
  if (!data || isEmpty(data)) {
    return null;
  }

  const { accumulation, percentiles = {}, probabilities = {} } = data;

  return {
    accumulation: accumulation === undefined ? null : round(accumulation),
    range: toRange(percentiles),
    percentiles: Object.keys(percentiles)
      .sort(numerically)
      .map((key) => ({
        percentile: Number(key),
        amount: round(percentiles[key]),
      })),
    probabilities: Object.keys(probabilities)
      .sort(numerically)
      .map((key) => ({
        atLeast: Number(key),
        // WPC publishes these as percents, but every chance we hand out is a fraction
        chance: round(probabilities[key] / 100),
      })),
  };
};

// Keyed by the same NDFD (wfo, x, y) gridpoint used elsewhere for grid data.
export const getWpcProbPrecip = async ({ wfo, x, y }) => {
  try {
    const db = await openDatabase();
    const result = await db.query(
      `SELECT rain_data, snow_data, freezing_rain_data, cycle, valid_time
       FROM weathergov_wpc_prob_precip
       WHERE wfo=$1::text AND x=$2::int AND y=$3::int
       LIMIT 1`,
      [wfo, x, y],
    );

    if (result.rows.length === 0) {
      return { error: true };
    }

    const { rain_data, snow_data, freezing_rain_data, cycle, valid_time } =
      result.rows[0];

    const end = new Date(valid_time);

    return {
      cycle,
      period: {
        start: new Date(end.getTime() - PERIOD_HOURS * 60 * 60 * 1000),
        end,
        hours: PERIOD_HOURS,
      },
      rain: toVariable(rain_data),
      snow: toVariable(snow_data),
      freezingRain: toVariable(freezing_rain_data),
    };
  } catch (err) {
    wpcProbLogger.error(
      { err, wfo, x, y },
      "could not fetch wpc probabilistic precip data",
    );
    return { error: true };
  }
};

export default getWpcProbPrecip;
