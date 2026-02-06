import { Worker } from "node:worker_threads";
import path from "node:path";
import getAlerts from "./alerts/index.js";
import { alignAlertsToDaily } from "./alerts/utils.js";
import getForecast from "./forecast/index.js";
import getObservations from "./obs/index.js";
import { getPointData } from "./points.js";
import getSatellite from "./satellite.js";
import getProductById from "./products/index.js";
import { logger } from "../util/monitoring/index.js";
import getDbConnection from "./db.js";
import { ForecastGridCache } from "./forecast/cache.js";

const forecastLogger = logger.child({ subsystem: "forecast" });

forecastLogger.info("starting background worker");

const backgroundWorker = new Worker("/app/src/data/forecast/backgroundTasks.ts");
backgroundWorker.on("message", (msg) => { });

const gridCache = new ForecastGridCache(backgroundWorker);
backgroundWorker.postMessage({ action: "start" });

const getDataForPoint = async (lat: any, lon: any) => {
  forecastLogger.trace({ lat, lon }, "fetching forecast");
  const { point, place, grid, isMarine } = await getPointData(lat, lon);

  forecastLogger.trace("satellite promise");
  let satellitePromise: any = Promise.resolve({ error: true });
  let forecast: any = { daily: { error: true } };
  let observed: any = { error: true };

  // If we don't have a grid, we can't fetch satellite metadata, forecast, or
  // observations – all of these are based around WFO and WFO grid.
  if (!grid.error) {
    // Cache grid point information
    // This is a synchronous push to an array. Fire and Forget
    gridCache.logGridHit(grid);

    if (place) {
      satellitePromise = getSatellite({ grid, place });
    }

    const dbPool = await getDbConnection();
    forecastLogger.trace("getting db connection");
    const dbConnection = await dbPool.connect();
    forecastLogger.trace("got db connection");

    try {
      const { forecast: fct, observed: obs } = await Promise.all([
        place ? getForecast({ grid, place, isMarine }) : { daily: { error: true }, gridData: {} },
        place ? getObservations({ grid, point, place }, dbConnection) : { error: true },
      ]).then(([forecastData, obsData]) => {
        // The forecast endpoint returns extra information about the grid. Why? I
        // dunno. But anyway, let's put it with the other grid info and remove it
        // from the forecast data.
        Object.assign(grid, forecastData.gridData);
        delete forecastData.gridData;

        // The daily forecast endpoint includes elevation information, but that
        // really belongs with the grid, so let's move that, too.
        if (!forecastData.daily.error && forecastData.daily.elevation) {
          grid.elevation = forecastData.daily.elevation;
          delete forecastData.daily.elevation;
        }

        return { forecast: forecastData, observed: obsData };
      });

      forecast = fct;
      observed = obs;
    } finally {
      forecastLogger.trace("releasing db connection");
      await dbConnection.release();
    }

  }

  // Get alerts regardless. If there's no grid, we can fallback to using the
  // requested point lat/lon.
  //
  // Why do we use the grid at all, you ask? Because a grid cell is geographically
  // larger, so any error between the requested location and the actual lat/lon
  // we're using is smoothed over because instead of looking for alerts that
  // intersect a single point, we're looking for alerts that intersect a 1.5km
  // by 1.5km square.
  const alerts = await getAlerts({ grid, point, place });

  // If we have a daily forecast, we can go ahead and populate it with related
  // data.
  if (!forecast.daily.error) {
    // Now map alerts into the daily forecast. Only do the days that have hours in
    // them. This shouldn't be an issue, but better safe than sorry.
    alignAlertsToDaily(alerts, forecast.daily.days);
  }

  // If the grid response is that the requested point is out-of-bounds, then it
  // outside of NWS's area of responsibility entirely. We don't need to pass
  // along anything else.
  if (grid.outOfBounds) {
    return {
      point,
      error: true,
      status: 404,
      reason: "out-of-bounds",
    };
  }

  // Only return the hashes.
  alerts.items = alerts.items.map(({ hash }) => hash);

  // If the grid response is that the point is unavailable, then it is within
  // NWS's responsibility but the data isn't in the API. We see this mainly
  // with American Samoa. However, there may still be alerts, so let's put those
  // in here.
  if (grid.notSupported) {
    return {
      alerts,
      point,
      place,
      error: true,
      status: 200,
      reason: "not-supported",
    };
  }

  const satellite = await satellitePromise;

  // Call format() on the hours. This causes dayjs to convert them to ISO
  // strings while preserving the UTC offset information. If we don't convert
  // them manually, the default toString() method outputs times in UTC, which is
  // not what we want.
  //
  // We do this conversion at the very end because the time is preserved as a
  // dayjs object up to this point and is used for aligning alerts to hours.
  forecast.daily.days?.forEach((day) => {
    day.hours.forEach((hour) => {
      // Note that hour object can be shared by multiple days, particularly the
      // 6am hour. (It is the last hour of one day and the first hour of the
      // next day.) Don't try to format them twice.
      if (typeof hour.time !== "string") {
        hour.time = hour.time.format();
      }
    });
  });

  return {
    alerts,
    observed,
    point,
    place,
    grid,
    isMarine,
    forecast: forecast.daily,
    satellite,
  };
};

export { getDataForPoint, getProductById };
