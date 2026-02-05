import daily from "./daily.js";
import gridpoint from "./gridpoint.js";
import hourly, { sortAndFilterHours } from "./hourly.js";
import { convertValue, convertProperties } from "../../util/convert.js";
import dayjs from "../../util/day.js";
import { fetchAPIJson } from "../../util/fetch.js";
import { getMarineDays } from "./marine.js";

export const assignHoursToDays = (dayData: any, hours: any, dayToStartAndEndMap: any) => {
  let dayIndex = 0;
  let hourIndex = 0;

  // So long as we haven't run out of hours or days, keep going. Sooner or
  // later we'll have looked at everything or the universe will have
  // expired, and in either case we can stop.
  while (hourIndex < hours.length && dayIndex < dayData.days.length) {
    const day = dayData.days[dayIndex];

    if (dayIndex === 0) {
      // If we're on the first day, we need to first figure out how many hours
      // the day consists of. The first day is the current time until 6am the
      // next day. All subsequent days are 24 hours (6am-6am).
      //
      // These times come from the daily forecast. The first day's forecast
      // start time is updated at the top of each hour.
      const { start, end } = dayToStartAndEndMap.get(day);
      const numberOfHoursToday = end.diff(start, "hours");

      // We also want to discard any hours from before the start of the first
      // day. The hourly forecast can have some previous hours in it, but we
      // don't want those.
      //
      // These hours represent the HOURLY forecast. The daily forecast never
      // includes the past, but the hourly forecast can.
      while (hours[hourIndex].time.isBefore(start)) {
        hourIndex += 1;
      }

      // The hours for the first day start with the updated index and include
      // however many hours we determined above, INCLUSIVE, because the 6am hour
      // should appear as the last hour in one day and the first hour in the
      // next day. In order to include it, we need the plus one.
      day.hours = hours.slice(hourIndex, hourIndex + numberOfHoursToday + 1);

      // Now fast foward the hour index by however many hours today is. Not
      // plus one here because the next day should also include the same 6am
      // that concludes the current day.
      hourIndex += numberOfHoursToday;
    } else {
      // If we're not on the first day, then we want the next 25 hours - from
      // current 6am to next 6am, inclusive. That is, 24 + 1. Silly inclusive/
      // exclusive slicing.
      day.hours = hours.slice(hourIndex, hourIndex + 25);

      // And fast forward by 24 hours. Not 25, to preserve the 6am hour.
      hourIndex += 24;
    }

    // Pull out PoP values from the hourly for
    // the daily periods and the overall day
    updateMaxPop(day);

    // Now move on to the next day.
    dayIndex += 1;
  }
};

/**
 * Helper function to set the max PoP
 * for a given day/period from the formatted hourly
 * forecast for the day.
 */
export const updateMaxPop = (day: any) => {
  // We set the probability of precip for each daily period
  // to be the highest percentage taken from the _hourly_ data
  // that is between the start and end times for the period
  const maxPopsForDay = [0];
  day.periods.forEach((period) => {
    const dayStart = dayjs(period.start);
    const dayEnd = dayjs(period.end);
    const relevantHours = day.hours.filter((hour) => {
      const start = dayjs(hour.time);
      return dayStart.isSameOrBefore(start) && dayEnd.isSameOrAfter(start);
    });
    const pops = relevantHours.map((hour) => {
      if (!hour.probabilityOfPrecipitation) {
        return 0;
      }
      return hour.probabilityOfPrecipitation.percent;
    });
    const maxPop = Math.round(Math.max(...pops) / 5) * 5;
    maxPopsForDay.push(maxPop);
    period.data.probabilityOfPrecipitation.hourlyMax = maxPop;
  });

  // Also set the overall daily max PoP (all periods) on the
  // top level of the day object itself
  day.maxPop = Math.max(...maxPopsForDay);
};

/**
 * Fetches and formats the main forecast object
 */
export default async ({ grid, place, isMarine }: any) => {
  const hours = new Map();

  // The hours map is passed into the gridpoint and hourly data processors so
  // we can build a comprehensive – but single – list of all the hours covered
  // by either the gridpoints or /forecast/hourly endpoints. It's kinda clunky,
  // but it saves us having to merge two arrays later.
  //
  // We pass the place object along to all of them so they can access the
  // timezone and coerce the times provided to us into forecast-local times.
  const gridpointPromise = fetchAPIJson(
    `/gridpoints/${grid.wfo}/${grid.x},${grid.y}`,
  ).then((data) => gridpoint(data, hours, place));

  // There is not a distinct daily forecast for marine data, so if we're in a
  // marine location, just resolve an empty object. We'll populate it manually.
  const dailyPromise = isMarine
    ? Promise.resolve({})
    : fetchAPIJson(`/gridpoints/${grid.wfo}/${grid.x},${grid.y}/forecast`).then((data) => daily(data, place),
      );

  // Similarly, there is no distinct hourly forecast data. We only have the
  // gridpoint forecast, which is already hourly.
  const hourlyPromise = isMarine
    ? Promise.resolve(false)
    : fetchAPIJson(
        `/gridpoints/${grid.wfo}/${grid.x},${grid.y}/forecast/hourly`,
      ).then((data) => {
        hourly(data, hours, place);
      });

  // We don't capture the results of the hourly processing function because it
  // doesn't return anything. All of its work gets put into the hours map.
  const [dailyData, gridpointData] = await Promise.all([
    dailyPromise,
    gridpointPromise,
    hourlyPromise,
  ]);

  const now = dayjs()
    .tz(place.timezone)
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0);

  // Sort the hours and remove any that occur before midnight at place-local
  // time today.
  const orderedHours = sortAndFilterHours([...hours.values()], now);

  // Do unit conversions on all the hourly properties. Each item in the array
  // is an object representing one hour. Each property in the object represents
  // a measurable value.
  orderedHours.forEach(convertProperties);

  orderedHours.forEach(({ windGust, windSpeed }) => {
    // Not every hour period will have gusts and wind. Some of the further out
    // future forecast periods just don't have wind yet.
    if (windGust && windSpeed) {
      if (windGust.mph < windSpeed.mph + 8) {
        // If the wind gust is less than 8 mph more than sustained winds, then
        // we just set that to null. Get all the units.
        Object.keys(windGust).forEach((unit) => {
          windGust[unit] = null;
        });
      }
    }
  });

  // Also convert the QPF. QPF is represented as an array of individual
  // measurements instead of an array of objects whose values are measurements.
  if (gridpointData.qpf) {
    gridpointData.qpf.forEach(({ liquid, ice, snow }: any) => {
      convertValue(liquid);
      convertValue(ice);
      convertValue(snow);
    });
  }

  // For marine data, we don't have a daily forecast, but we do have elements of
  // an hourly forecast. We can use those hours to build a list of days.
  if (isMarine) {
    dailyData.days = await getMarineDays(hours, place.timezone);
  }

  const dayStartAndEnd = new Map();

  // Now add the appropriate QPF and hourly data to each day.
  for (const day of dailyData.days ?? []) {
    // Make sure the day has an hours property. Empty for now, and
    // we'll fill it up later.
    day.hours = [];

    const start = dayjs.utc(day.start).tz(place.timezone);
    const end = dayjs.utc(day.end).tz(place.timezone);
    dayStartAndEnd.set(day, { start, end });

    if (gridpointData.qpf) {
      day.qpf = gridpointData.qpf.filter(({ start: qpfStart, end: qpfEnd }) => {
        // QPF is provided in multi-hour chunks, but unlike the other measurables,
        // the value is the total across the time period rather than continuous.
        // So we have to preserve the multi-hour-ness of QPF. As a result,
        // determining whether a QPF belongs to a given day is slightly more
        // complex. If either the QPF start or end time is between the day start
        // and end time, then it belongs in the day.
        if (qpfStart.isSameOrAfter(start) && qpfStart.isBefore(end)) {
          return true;
        }
        return qpfEnd.isSameOrAfter(start) && qpfEnd.isBefore(end);
      });

      const hasLiquid = day.qpf.some(({ liquid }) => liquid !== null && liquid.in > 0,
      );
      const hasIce = day.qpf.some(({ ice }) => ice !== null && ice.in > 0);
      const hasSnow = day.qpf.some(({ snow }) => snow !== null && snow.in > 0);

      day.qpf = {
        // Format the start and end dates. Using the .format() method preserves
        // UTC offset. Otherwise we get the default stringification, which uses
        // UTC time with no offsets.
        periods: day.qpf.map(({ start, end, ...rest }: any) => ({
          start: start.format(),
          end: end.format(),
          ...rest,
        })),
        hasIce,
        hasSnow,
        hasQPF: hasLiquid || hasIce || hasSnow,
      };
    }
  }

  assignHoursToDays(dailyData, orderedHours, dayStartAndEnd);

  // At this point, QPF has been shuffled into the daily forecast object, so
  // we can remove it from the grid. It's not really a grid property anyway.
  delete gridpointData.qpf;

  // Whatever gridData is returned here gets merged into the top-level grid
  // object that contains other information such as the WFO and grid X and Y
  // coordinates.
  return { gridData: gridpointData, daily: dailyData };
};
