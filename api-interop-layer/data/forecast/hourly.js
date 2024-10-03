import { sentenceCase } from "../../util/case.js";
import dayjs from "../../util/day.js";
import { parseAPIIcon } from "../../util/icon.js";


export const sortAndFilterHours = (hours, earliest) => {
  // Align the passed in time to the start of its
  // hour
  const alignedEarliest = earliest.startOf("hour");
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
    .filter(({ time }) => time.isSameOrAfter(alignedEarliest));
};

export const filterHoursForDay = (hours, dayStart) => {
  // For the purposes of NWS, we consider a day to end at 6am
  // the following day
  const dayEnd = dayStart
        .hour(6)
        .minute(0)
        .second(0)
        .millisecond(0)
        .add(1, "day");
  return hours.filter(({time}) => {
    return time.isSameOrAfter(dayStart) && time.isSameOrBefore(dayEnd);
  });
};

export const filterHoursForCurrentDay = (hours, currentTime) => {
  const startHour = currentTime.hour();
  const limit = currentTime
        .hour(6)
        .minute(0)
        .second(0)
        .millisecond(0)
        .add(1, "day");
  return hours.filter(({time}) => time.isSameOrBefore(limit));
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
