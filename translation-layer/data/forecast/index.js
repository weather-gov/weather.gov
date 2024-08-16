import daily from "./daily.js";
import gridpoint from "./gridpoint.js";
import hourly from "./hourly.js";
import { convertProperties } from "../../util/convert.js";
import dayjs from "../../util/day.js";
import { fetchAPIJson } from "../../util/fetch.js";

export default async ({ grid }) => {
  const hours = new Map();

  const gridPromise = fetchAPIJson(
    `/gridpoints/${grid.wfo}/${grid.x},${grid.y}`,
  ).then((data) => gridpoint(data, hours));
  const dailyPromise = fetchAPIJson(
    `/gridpoints/${grid.wfo}/${grid.x},${grid.y}/forecast`,
  ).then((data) => daily(data));
  const hourlyPromise = fetchAPIJson(
    `/gridpoints/${grid.wfo}/${grid.x},${grid.y}/forecast/hourly`,
  ).then((data) => {
    hourly(data, hours);
  });
  const [dailyData, gridData] = await Promise.all([
    dailyPromise,
    gridPromise,
    hourlyPromise,
  ]);

  const earliest = dayjs()
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0);

  const h = [...hours.values()]
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
    .filter(({ time }) => dayjs(time) >= earliest);

  h.forEach((hour) => {
    convertProperties(hour);
  });

  let hourIndex = 0;
  for (const day of dailyData.days) {
    for (const period of day.periods) {
      const start = dayjs(period.start);
      const end = dayjs(period.end);

      period.hours = [];
      while (
        hourIndex < h.length &&
        h[hourIndex].time >= start &&
        h[hourIndex].time < end
      ) {
        period.hours.push(h[hourIndex]);
        hourIndex += 1;
      }
    }

    // day.hours = day.periods.flatMap(({ hours: periodHours }) => periodHours);
  }

  return { gridData, daily: dailyData /*hourly: h*/ };
};
