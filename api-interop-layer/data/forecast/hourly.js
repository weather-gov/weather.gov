import { sentenceCase } from "../../util/case.js";
import dayjs from "../../util/day.js";
import { parseAPIIcon } from "../../util/icon.js";

export default (data, hours, { timezone }) => {
  for (const period of data.properties.periods) {
    let start = dayjs(period.startTime).tz(timezone);
    const end = dayjs(period.endTime).tz(timezone);

    while (start < end) {
      // Always take hours DOWN to the last whole hour. This should never be an
      // issue with API data, but let's protect ourselves anyway.
      const time = start.startOf("hour").toISOString();

      const hourData = hours.get(time) ?? {};
      hourData.time = start;
      hourData.hour = start.format("h A");
      hourData.shortForecast = sentenceCase(period.shortForecast);
      hourData.icon = parseAPIIcon(period.icon);

      hours.set(time, hourData);

      start = start.add(1, "hour");
    }
  }
};
