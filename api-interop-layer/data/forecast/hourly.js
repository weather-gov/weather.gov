import { sentenceCase } from "../../util/case.js";
import { parseAPIIcon } from "../../util/icon.js";

export const sortAndFilterHours = (hours, earliest) => {
  // Align the passed in time to the start of its
  // hour
  return hours
    .sort(({ time: a }, { time: b }) => {
      if (a > b) {
        return 1;
      }
      if (a < b) {
        return -1;
      }
      return 0;
    })
    .filter(({ time }) => time >= earliest);
};

export default (data, hours) => {
  if (data.error) {
    return;
  }

  for (const period of data.properties.periods) {
    let start = new Date(period.startTime);
    start.setMinutes(0);
    start.setSeconds(0);
    start.setMilliseconds(0);

    const end = new Date(period.endTime);

    while (start < end) {
      // Always take hours DOWN to the last whole hour. This should never be an
      // issue with API data, but let's protect ourselves anyway.
      const time = start.getTime();

      const hourData = hours.get(time) ?? {};
      hourData.time = new Date(start);
      hourData.shortForecast = sentenceCase(period.shortForecast);
      hourData.icon = parseAPIIcon(period.icon);

      hours.set(time, hourData);

      start.setUTCHours(start.getUTCHours() + 1);
    }
  }
};
