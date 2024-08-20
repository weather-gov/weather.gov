import { sentenceCase } from "../../util/case.js";
import dayjs from "../../util/day.js";
import { parseAPIIcon } from "../../util/icon.js";

const dayjsOffset = (iso8601) => {
  const time = dayjs(iso8601);
  const [, offset] = iso8601.match(/([-+]\d{2}:\d{2})$/) ?? [];

  if (offset === "z") {
    return time;
  }

  const [, direction, hours, minutes] =
    offset.match(/([-+])(\d{2}):(\d{2})/) ?? [];
  const bump = +hours * 60 + +minutes;

  return time.utcOffset(bump * (direction === "-" ? -1 : 1));
};

export default (data, hours) => {
  for (const period of data.properties.periods) {
    let start = dayjsOffset(period.startTime);
    const end = dayjsOffset(period.endTime);

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
