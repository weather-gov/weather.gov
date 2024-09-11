import getAlerts from "./alerts/index.js";
import getForecast from "./forecast/index.js";
import getObservations from "./obs/index.js";
import getPoint from "./points.js";
import getSatellite from "./satellite.js";
import dayjs from "../util/day.js";
import { createLogger } from "../util/monitoring/index.js";

const logger = createLogger("forecast");

export const getDataForPoint = async (lat, lon) => {
  logger.verbose(`fetching forecast for ${lat}, ${lon}}`);
  const { point, place, grid } = await getPoint(lat, lon);

  const satellitePromise = getSatellite({ grid });

  const { forecast, observed } = await Promise.all([
    getForecast({ grid, place }),
    getObservations({ grid, point }),
  ]).then(([forecastData, obsData]) => {
    // The forecast endpoint returns extra information about the grid. Why? I
    // dunno. But anyway, let's put it with the other grid info and remove it
    // from the forecast data.
    Object.assign(grid, forecastData.gridData);
    delete forecastData.gridData;

    // The daily forecast endpoint includes elevation information, but that
    // really belongs with the grid, so let's move that, too.
    if (forecastData.daily.elevation) {
      grid.elevation = forecastData.daily.elevation;
      delete forecastData.daily.elevation;
    }

    return { forecast: forecastData, observed: obsData };
  });

  const alerts = await getAlerts({ grid, point, place });

  // Now map alerts into the daily forecast. Only do the days that have hours in
  // them. This shouldn't be an issue, but better safe than sorry.
  for (const day of forecast.daily.days.filter(
    ({ hours }) => hours.length > 0,
  )) {
    day.alerts = { metadata: { count: 0, highest: "other" }, items: [] };

    const start = day.hours[0].time;
    const end = day.hours[day.hours.length - 1].time;

    // Filter down to just the alerts that are or will be active during this
    // particular day.
    const dayAlerts = alerts.items.filter(
      ({ onset, finish }) =>
        onset.isSameOrBefore(end) && finish.isSameOrAfter(start),
    );

    dayAlerts.forEach((alert) => {
      // How deep into the hourly forecast does this alert appear? This is based
      // on the hourly part of the forecast day, not the entire forecast day,
      // because the hourly part begins at the top of the next hour. This is
      // essentially which hour the alert begins on.
      const offset = Math.max(
        0,
        Math.floor(dayjs.duration(alert.onset.diff(start)).asHours()),
      );

      // How long will the alert last AFTER the start of the first hour of the
      // hourly forecast?
      const absoluteDuration = Math.ceil(
        dayjs.duration(alert.finish.diff(start)).asHours() - offset,
      );

      // Cap the alert duration at the remaining hours in the forecast.
      const duration = Math.min(absoluteDuration, day.hours.length - offset);

      // Save the alert.
      day.alerts.items.push({
        id: alert.id,
        event: alert.event,
        level: alert.metadata.level.text,
        offset,
        duration,
        // The number of hours remaining in the forecast when this alert ends.
        remainder: day.hours.length - offset - duration,
      });
    });

    // Get the number of alerts and the "level" of the most significant alert
    // and pull those up to the top level.
    day.alerts.metadata.count = day.alerts.items.length;
    day.alerts.metadata.highest = dayAlerts
      .map(({ metadata: { level } }) => level)
      .sort((a, b) => {
        const priorityA = a.priority;
        const priorityB = b.priority;

        return priorityB - priorityA;
      })
      .pop()?.text;
  }

  const satellite = await satellitePromise;

  return {
    alerts,
    observed,
    point,
    place,
    grid,
    forecast: forecast.daily,
    satellite,
  };
};

export default { getDataForPoint };
