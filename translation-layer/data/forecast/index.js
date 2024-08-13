import dayjs from "dayjs";
import gridpoint from "./gridpoint.js";
import hourly from "./hourly.js";

export default async ({ grid }) => {
  const hours = new Map();

  const gridPromise = fetch(
    `https://api.weather.gov/gridpoints/${grid.wfo}/${grid.x},${grid.y}`,
  )
    .then((r) => r.json())
    .then((data) => gridpoint(data, hours));
  const dailyPromise = fetch(
    `https://api.weather.gov/gridpoints/${grid.wfo}/${grid.x},${grid.y}/forecast`,
  )
    .then((r) => r.json())
    .then((data) => data.properties);
  const hourlyPromise = fetch(
    `https://api.weather.gov/gridpoints/${grid.wfo}/${grid.x},${grid.y}/forecast/hourly`,
  )
    .then((r) => r.json())
    .then((data) => {
      hourly(data, hours);
    });
  const [daily, gridData] = await Promise.all([
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

  return { gridData, daily, hourly: h };
};
