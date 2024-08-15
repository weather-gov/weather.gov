import dayjs from "dayjs";
import tz from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { convertProperties } from "../../util/convert.js";

dayjs.extend(tz);
dayjs.extend(utc);

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

export default (data) => {
  const days = [{ periods: [] }];

  for (const period of data.properties.periods) {
    const start = dayjsOffset(period.startTime);
    const startHour = start.get("hour");

    if (startHour === 6) {
      if (days.length > 0) {
        days[days.length - 1].end = period.startTime;
      }
      days.push({
        start: period.startTime,
        periods: [],
      });
    }

    const dayPeriod = days[days.length - 1];
    if (!dayPeriod.start) {
      dayPeriod.start = period.startTime;
    }

    const periodData = {
      start: period.start,
      end: period.endTime,
      isDaytime: period.isDaytime,
      data: convertProperties({
        icon: period.icon,
        description: period.shortForecast,
        temperature: {
          unitCode: "wmoUnit:degF",
          value: period.temperature,
        },
        probabilityOfPrecipitation: period.probabilityOfPrecipitation,
        windSpeed: {
          unitCode: "wxgov:mph",
          value: Number.parseInt(period.windSpeed, 10),
        },
        windDirection: period.windDirection,
      }),
    };

    dayPeriod.periods.push(periodData);
  }

  return {
    elevation: data.properties.elevation,
    generated: data.properties.generatedAt,
    updated: data.properties.updateTime,
    valid: data.properties.validTimes,
    days,
  };
};
