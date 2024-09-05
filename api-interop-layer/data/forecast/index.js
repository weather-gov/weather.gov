import daily from "./daily.js";
import gridpoint from "./gridpoint.js";
import hourly from "./hourly.js";
import { convertValue, convertProperties } from "../../util/convert.js";
import dayjs from "../../util/day.js";
import { fetchAPIJson } from "../../util/fetch.js";

export default async ({ grid, place }) => {
  const hours = new Map();

  const gridPromise = fetchAPIJson(
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
    .filter(({ time }) => time.isAfter(earliest));

  h.forEach((hour) => {
    convertProperties(hour);
  });

  gridData.qpf.forEach((period) => convertValue(period));

  for (const day of dailyData.days) {
    const start = dayjs.tz(day.start);
    const end = dayjs.tz(day.end);

    day.qpf = gridData.qpf.filter(({ start: qpfStart, end: qpfEnd }) => {
      if (qpfStart.isSameOrAfter(start) && qpfStart.isBefore(end)) {
        return true;
      }
      return qpfEnd.isSameOrAfter(start) && qpfEnd.isBefore(end);
    });

    day.hours = h.filter(
      ({ time }) => time.isSameOrAfter(start) && time.isSameOrBefore(end),
    );
  }

  return { gridData, daily: dailyData };
};
