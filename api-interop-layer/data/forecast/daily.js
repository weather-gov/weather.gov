import dayjs from "../../util/day.js";
import { convertProperties } from "../../util/convert.js";
import { parseAPIIcon } from "../../util/icon.js";
import { sentenceCase } from "../../util/case.js";

const dayjsOffset = (iso8601) => {
  const time = dayjs(iso8601);
  const [, offset] = iso8601.match(/([-+]\d{2}:\d{2})$/) ?? [];

  if (!offset || offset === "z") {
    return time;
  }

  const [, direction, hours, minutes] =
    offset.match(/([-+])(\d{2}):(\d{2})/) ?? [];
  const bump = +hours * 60 + +minutes;

  return time.utcOffset(bump * (direction === "-" ? -1 : 1));
};

export default (data, { timezone }) => {
  if (data.error) {
    return { error: true };
  }
  const days = [];
  let previousDay = -1;

  for (const period of data.properties.periods) {
    const start = dayjsOffset(period.startTime);

    if (start.get("day") !== previousDay) {
      if (days.length > 0) {
        days[days.length - 1].end = period.startTime;
      }

      days.push({ start: period.startTime, periods: [] });
      previousDay = start.get("day");
    }

    const dayPeriod = days[days.length - 1];
    if (!dayPeriod.start) {
      dayPeriod.start = period.startTime;
    }
    if (days.length > 0) {
      days[days.length - 1].end = period.endTime;
    }

    const isOvernight =
      days.length === 1 &&
      dayPeriod.periods.length === 0 &&
      period.isDaytime === false;

    const periodData = {
      start: dayjs(period.startTime),
      end: dayjs(period.endTime),
      isDaytime: period.isDaytime,
      isOvernight,
      monthAndDay: start.tz(timezone).format("MMM D"),
      dayName: days.length === 1 ? "Today" : start.tz(timezone).format("dddd"),
      data: convertProperties({
        icon: parseAPIIcon(period.icon),
        description: sentenceCase(period.shortForecast),
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

    // Add time labels to the first day
    if (days.length === 1) {
      if (isOvernight) {
        periodData.timeLabel = "NOW-6AM";
      } else if (periodData.isDaytime) {
        periodData.timeLabel = "6AM-6PM";
      } else {
        periodData.timeLabel = "6PM-6AM";
      }
    }

    dayPeriod.periods.push(periodData);
  }

  days.forEach((day) => {
    day.start = dayjs(day.start);
    day.end = dayjs(day.end);
  });

  return {
    ...convertProperties({ elevation: data.properties.elevation }),
    generated: data.properties.generatedAt,
    updated: data.properties.updateTime,
    valid: data.properties.validTimes,
    days: days.filter(({ periods }) => periods.length > 0),
  };
};
