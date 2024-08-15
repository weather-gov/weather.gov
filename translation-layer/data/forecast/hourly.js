import dayjs from "../../util/day.js";

export default (data, hours) => {
  for (const period of data.properties.periods) {
    let start = dayjs(period.startTime);
    const end = dayjs(period.endTime);

    while (start < end) {
      const time = start.toISOString();

      const hourData = hours.get(time) ?? {};
      hourData.time = start;
      hourData.shortForecast = period.shortForecast;
      hourData.icon = period.icon;

      hours.set(time, hourData);

      start = start.add(1, "hour");
    }
  }
};
