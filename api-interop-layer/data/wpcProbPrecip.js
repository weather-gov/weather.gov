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

// Positions inside each period's slice, in the order the task writes them
const PERCENTILES = [5, 10, 25, 50, 75, 90, 95];
const THRESHOLDS = {
  rain: [0.01, 0.1, 0.25, 0.5, 1, 2, 3, 4, 6, 8, 12],
  snow: [0.1, 1, 2, 4, 6, 8, 12, 18],
  freezingRain: [0.01, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
};

// The task writes NaN where a band never decoded
const defined = (value) => value !== null && !Number.isNaN(value);

// Both amounts and chances carry two decimals, and rounding also clears the float32 artifacts the round-trip leaves behind
const round = (value) => Math.round(value * 100) / 100;

const toRange = (percentiles, accumulation) => {
  const range = {};
  for (const [slot, percentile, chance] of BRACKET) {
    const amount = slot === "expected" ? accumulation : percentiles[percentile];
    if (amount !== undefined) {
      range[slot] = { amount: round(amount), chance };
    }
  }
  return Object.keys(range).length > 0 ? range : null;
};

const toVariable = (column, periodIndex, thresholds) => {
  const width = 1 + PERCENTILES.length + thresholds.length;
  const slice = column?.slice(periodIndex * width, (periodIndex + 1) * width);

  // Out of season WPC still publishes a full set of zeros, which is a variable worth no section rather than an empty one
  if (
    !slice ||
    slice.length < width ||
    slice.every((v) => !defined(v) || v === 0)
  ) {
    return null;
  }

  const accumulation = defined(slice[0]) ? slice[0] : undefined;
  const percentiles = {};
  PERCENTILES.forEach((p, i) => {
    if (defined(slice[1 + i])) {
      percentiles[p] = slice[1 + i];
    }
  });

  return {
    accumulation: accumulation === undefined ? null : round(accumulation),
    range: toRange(percentiles, accumulation),
    percentiles: PERCENTILES.filter((p) => p in percentiles).map((p) => ({
      percentile: p,
      amount: round(percentiles[p]),
    })),
    probabilities: thresholds
      .map((atLeast, i) => [atLeast, slice[1 + PERCENTILES.length + i]])
      .filter(([, chance]) => defined(chance))
      // WPC publishes these as percents, but every chance we hand out is a fraction
      .map(([atLeast, chance]) => ({ atLeast, chance: round(chance / 100) })),
  };
};

// Keyed by the same NDFD (wfo, x, y) gridpoint used elsewhere for grid data.
export const getWpcProbPrecip = async ({ wfo, x, y }) => {
  try {
    const db = await openDatabase();
    const result = await db.query(
      `SELECT rain_data, snow_data, freezing_rain_data, cycle, valid_times
       FROM weathergov_wpc_prob_precip
       WHERE wfo=$1::text AND x=$2::int AND y=$3::int
       LIMIT 1`,
      [wfo, x, y],
    );

    if (result.rows.length === 0) {
      return { error: true };
    }

    const { rain_data, snow_data, freezing_rain_data, cycle, valid_times } =
      result.rows[0];

    return {
      cycle,
      periods: valid_times.map((validTime, index) => {
        const end = new Date(validTime);
        return {
          period: {
            start: new Date(end.getTime() - PERIOD_HOURS * 60 * 60 * 1000),
            end,
            hours: PERIOD_HOURS,
          },
          rain: toVariable(rain_data, index, THRESHOLDS.rain),
          snow: toVariable(snow_data, index, THRESHOLDS.snow),
          freezingRain: toVariable(
            freezing_rain_data,
            index,
            THRESHOLDS.freezingRain,
          ),
        };
      }),
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
