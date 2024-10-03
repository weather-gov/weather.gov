import { sentenceCase } from "../../util/case.js";
import dayjs from "../../util/day.js";
import { parseAPIIcon } from "../../util/icon.js";

/**
 * Given an array of processed hourly forecast
 * hour objects, each with a `time` property,
 * and a dayjs object corresponding to the earliest
 * time we care about, return a sorted list of hour
 * objects where only hours _after_ the given earliest
 * time are returned.
 * @param hours object[] - An array of processed hour
 * periods
 * @param earliest dayjs - A dayJS datetime
 * @returns object[] - A sorted and filtered array of
 * hour objects
 */
export const sortAndFilterHours = (hours, earliest) => {
  // Note: the following two rules:
  // - if the current local time is before midnight,
  //   the list of hours extends through 6am the next day
  // - if the current local time is between midnight and 6am,
  //   the list of hours extends through 6am the next day
  // Can be captured with the following code:
  const latest = earliest
        .hour(6)
        .minute(0)
        .second(0)
        .millisecond(0)
        .add(1, "day");
  return hours
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
    .filter(({ time }) => time.isAfter(earliest) && time.isSameOrBefore(latest));
};

export default (data, hours, { timezone }) => {
  if (data.error) {
    return;
  }

  for (const period of data.properties.periods) {
    let start = dayjs(period.startTime).tz(timezone);
    const end = dayjs(period.endTime).tz(timezone);

    while (start < end) {
      // Always take hours DOWN to the last whole hour. This should never be an
      // issue with API data, but let's protect ourselves anyway.
      const time = start.startOf("hour").toISOString();

      const hourData = hours.get(time) ?? {};
      hourData.time = start.startOf("hour");
      hourData.hour = start.format("h A");
      hourData.shortForecast = sentenceCase(period.shortForecast);
      hourData.icon = parseAPIIcon(period.icon);

      hours.set(time, hourData);

      start = start.add(1, "hour");
    }
  }
};
