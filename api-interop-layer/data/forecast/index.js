import daily from "./daily.js";
import gridpoint from "./gridpoint.js";
import hourly from "./hourly.js";
import { convertValue, convertProperties } from "../../util/convert.js";
import dayjs from "../../util/day.js";
import { fetchAPIJson } from "../../util/fetch.js";

export default async ({ grid, place }) => {
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

  const dailyPromise = fetchAPIJson(
    `/gridpoints/${grid.wfo}/${grid.x},${grid.y}/forecast`,
  ).then((data) => daily(data, place));

  const hourlyPromise = fetchAPIJson(
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

  const earliest = dayjs()
    .tz(place.timezone)
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0);

  // Sort the hours and remove any that occur before midnight at place-local
  // time today.
  const orderedHours = [...hours.values()]
    .sort(({ time: a }, { time: b }) => {
      const timeA = dayjs(a);
      const timeB = dayjs(b);

      if (timeA > timeB) {
        return 1;
      }
      if (timeA < timeB) {
        return -1;
      }
      return 0;
    })
    .filter(({ time }) => time.isAfter(earliest));

  // Do unit conversions on all the hourly properties. Each item in the array
  // is an object representing one hour. Each property in the object represents
  // a measurable value.
  orderedHours.forEach((hour) => {
    convertProperties(hour);
  });

  // Also convert the QPF. QPF is represented as an array of individual
  // measurements instead of an array of objects whose values are measurements.
  gridpointData.qpf.forEach((period) => convertValue(period));

  // Now add the appropriate QPF and hourly data to each day.
  for (const day of dailyData.days) {
    const start = dayjs.tz(day.start);
    const end = dayjs.tz(day.end);

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

    // Hours are simpler. Is the hour between the start and end? Done.
    day.hours = orderedHours.filter(
      ({ time }) => time.isSameOrAfter(start) && time.isSameOrBefore(end),
    );
  }

  // Whatever gridData is returned here gets merged into the top-level grid
  // object that contains other information such as the WFO and grid X and Y
  // coordinates.
  return { gridData: gridpointData, daily: dailyData };
};
